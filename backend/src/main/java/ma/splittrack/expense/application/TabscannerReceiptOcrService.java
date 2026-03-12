package ma.splittrack.expense.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import ma.splittrack.config.AppProperties;
import ma.splittrack.expense.api.dto.ReceiptOcrItemResponse;
import ma.splittrack.expense.api.dto.ReceiptOcrResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class TabscannerReceiptOcrService {
    private static final Set<String> SUMMARY_LINE_TYPES = Set.of(
        "total",
        "subtotal",
        "tax",
        "totaltax",
        "cash",
        "change",
        "tip",
        "servicecharge"
    );
    private static final Set<String> SKIP_NAME_FRAGMENTS = Set.of(
        "suma",
        "suma ptu",
        "podsuma",
        "subtotal",
        "ptu",
        "vat",
        "tax",
        "sprzedaz opodatkowana",
        "paragon",
        "fiskalny",
        "niefiskalny",
        "karta",
        "gotowka",
        "blik",
        "rabat",
        "opust",
        "terminal",
        "rozliczenie"
    );

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public TabscannerReceiptOcrService(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();
    }

    public ReceiptOcrResponse recognize(MultipartFile file) {
        AppProperties.Tabscanner config = appProperties.getOcr().getTabscanner();
        if (config.getApiKey() == null || config.getApiKey().isBlank()) {
            throw new IllegalStateException("Tabscanner jest wybrany jako OCR, ale brakuje APP_OCR_TABSCANNER_API_KEY");
        }

        UploadPayload uploadPayload = prepareUpload(file);
        JsonNode processResponse = submitProcess(uploadPayload, config);
        String token = readText(processResponse, "token");
        if (token == null || token.isBlank()) {
            throw new IllegalStateException("Tabscanner nie zwrócił tokenu skanu");
        }

        JsonNode resultResponse = pollResult(token, config);
        JsonNode result = resultResponse.path("result");

        List<ReceiptOcrItemResponse> items = parseItems(result.path("lineItems"));
        List<String> rawLines = collectRawLines(result);
        Integer creditsRemaining = fetchCredits(config);

        return new ReceiptOcrResponse(
            items,
            rawLines,
            "TABSCANNER",
            firstNonBlank(
                readText(result, "establishment"),
                readText(result, "validatedEstablishmentName")
            ),
            firstNonBlank(
                readText(result, "dateISO"),
                readText(result, "date")
            ),
            creditsRemaining
        );
    }

    private UploadPayload prepareUpload(MultipartFile file) {
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String originalName = file.getOriginalFilename() == null ? "receipt.jpg" : file.getOriginalFilename();

        try {
            if ("image/jpeg".equals(contentType) || "image/jpg".equals(contentType) || "image/png".equals(contentType)) {
                return new UploadPayload(file.getBytes(), normalizeFilename(originalName), normalizeMimeType(contentType));
            }

            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image == null) {
                throw new IllegalStateException("Tabscanner obsluguje JPG i PNG. Nie udalo sie przekonwertowac tego pliku do PNG.");
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ImageIO.write(image, "png", outputStream);
            return new UploadPayload(outputStream.toByteArray(), replaceExtension(originalName, ".png"), "image/png");
        } catch (IOException ex) {
            throw new IllegalStateException("Nie udalo sie przygotowac zdjecia paragonu dla Tabscannera", ex);
        }
    }

    private JsonNode submitProcess(UploadPayload uploadPayload, AppProperties.Tabscanner config) {
        String boundary = "----SplitTrackTabscanner" + UUID.randomUUID();
        List<byte[]> parts = new ArrayList<>();
        addFormField(parts, boundary, "documentType", config.getDocumentType());
        addFormField(parts, boundary, "region", config.getRegion());
        addFormField(parts, boundary, "defaultDateParsing", config.getDefaultDateParsing());
        addFileField(parts, boundary, "file", uploadPayload.filename(), uploadPayload.contentType(), uploadPayload.content());
        parts.add(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));

        HttpRequest request = HttpRequest.newBuilder()
            .uri(buildUri(config.getApiBaseUrl(), "/api/2/process"))
            .timeout(Duration.ofSeconds(appProperties.getOcr().getTimeoutSeconds()))
            .header("accept", "application/json")
            .header("apikey", config.getApiKey())
            .header("content-type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArrays(parts))
            .build();

        JsonNode body = sendJson(request, "Nie udalo sie wyslac paragonu do Tabscannera");
        ensureSuccessfulTabscannerResponse(body, "Tabscanner odrzucil zgloszenie skanu");
        return body;
    }

    private JsonNode pollResult(String token, AppProperties.Tabscanner config) {
        for (int attempt = 0; attempt < config.getMaxPollAttempts(); attempt++) {
            sleep(attempt == 0 ? Math.max(3000, config.getPollDelayMillis()) : config.getPollDelayMillis());

            HttpRequest request = HttpRequest.newBuilder()
                .uri(buildUri(config.getApiBaseUrl(), "/api/result/" + token))
                .timeout(Duration.ofSeconds(appProperties.getOcr().getTimeoutSeconds()))
                .header("accept", "application/json")
                .header("apikey", config.getApiKey())
                .GET()
                .build();

            JsonNode body = sendJson(request, "Nie udalo sie pobrac wyniku z Tabscannera");
            int statusCode = body.path("status_code").asInt();
            String status = readText(body, "status");

            if (statusCode == 202 || "done".equalsIgnoreCase(status)) {
                return body;
            }

            if (statusCode == 301 || "pending".equalsIgnoreCase(status)) {
                continue;
            }

            throw new IllegalStateException(buildTabscannerErrorMessage(body, "Tabscanner zwrocil blad analizy"));
        }

        throw new IllegalStateException("Tabscanner nie zwrocil wyniku w oczekiwanym czasie");
    }

    private Integer fetchCredits(AppProperties.Tabscanner config) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(buildUri(config.getApiBaseUrl(), "/api/credit"))
                .timeout(Duration.ofSeconds(10))
                .header("accept", "application/json")
                .header("apikey", config.getApiKey())
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            JsonNode body = objectMapper.readTree(response.body());
            if (body == null || body.isNull()) {
                return null;
            }
            if (body.isInt() || body.isLong()) {
                return body.asInt();
            }
            if (body.isTextual()) {
                return Integer.parseInt(body.asText());
            }
            return null;
        } catch (Exception ex) {
            return null;
        }
    }

    private List<ReceiptOcrItemResponse> parseItems(JsonNode lineItemsNode) {
        List<ReceiptOcrItemResponse> items = new ArrayList<>();
        Set<String> dedupe = new LinkedHashSet<>();

        if (!lineItemsNode.isArray()) {
            return items;
        }

        for (JsonNode lineItem : lineItemsNode) {
            if (items.size() >= appProperties.getOcr().getMaxItems()) {
                break;
            }

            String lineType = normalize(readText(lineItem, "lineType"));
            if (SUMMARY_LINE_TYPES.contains(lineType)) {
                continue;
            }

            BigDecimal amount = readDecimal(lineItem, "lineTotal");
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                amount = readDecimal(lineItem, "price");
            }
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            String name = firstNonBlank(readText(lineItem, "descClean"), readText(lineItem, "desc"));
            if (name == null || name.isBlank()) {
                name = joinSupplementaryLines(lineItem.path("supplementaryLineItems"));
            }
            if (name == null || name.isBlank() || shouldSkipName(name)) {
                continue;
            }

            String rawLine = firstNonBlank(
                readText(lineItem, "desc"),
                readText(lineItem, "descClean"),
                name
            );
            String supplementary = joinSupplementaryLines(lineItem.path("supplementaryLineItems"));
            if (supplementary != null && !supplementary.isBlank() && !rawLine.contains(supplementary)) {
                rawLine = rawLine + " | " + supplementary;
            }

            String key = normalize(name) + "|" + amount.toPlainString();
            if (!dedupe.add(key)) {
                continue;
            }

            items.add(new ReceiptOcrItemResponse(name.trim(), amount, rawLine.trim()));
        }

        return items;
    }

    private List<String> collectRawLines(JsonNode result) {
        LinkedHashSet<String> lines = new LinkedHashSet<>();
        addLines(lines, result.path("lineItems"));
        addLines(lines, result.path("summaryItems"));

        String establishment = readText(result, "establishment");
        if (establishment != null && !establishment.isBlank()) {
            lines.add(establishment.trim());
        }

        return new ArrayList<>(lines);
    }

    private void addLines(Set<String> lines, JsonNode itemsNode) {
        if (!itemsNode.isArray()) {
            return;
        }

        for (JsonNode item : itemsNode) {
            String desc = firstNonBlank(readText(item, "desc"), readText(item, "descClean"));
            if (desc != null && !desc.isBlank()) {
                lines.add(desc.trim());
            }

            String supplementary = joinSupplementaryLines(item.path("supplementaryLineItems"));
            if (supplementary != null && !supplementary.isBlank()) {
                lines.add(supplementary);
            }
        }
    }

    private String joinSupplementaryLines(JsonNode supplementaryNode) {
        List<String> parts = new ArrayList<>();
        addTextArray(parts, supplementaryNode.path("above"));
        addTextArray(parts, supplementaryNode.path("below"));
        if (parts.isEmpty()) {
            return null;
        }
        return String.join(" | ", parts);
    }

    private void addTextArray(List<String> target, JsonNode arrayNode) {
        if (!arrayNode.isArray()) {
            return;
        }

        for (JsonNode value : arrayNode) {
            if (value.isTextual() && !value.asText().isBlank()) {
                target.add(value.asText().trim());
            }
        }
    }

    private JsonNode sendJson(HttpRequest request, String failureMessage) {
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.body() == null || response.body().isBlank()) {
                throw new IllegalStateException(failureMessage + ": pusta odpowiedz serwera");
            }
            return objectMapper.readTree(response.body());
        } catch (IOException ex) {
            throw new IllegalStateException(failureMessage, ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(failureMessage, ex);
        }
    }

    private void ensureSuccessfulTabscannerResponse(JsonNode body, String failureMessage) {
        if (!body.path("success").asBoolean(false) && body.path("status_code").asInt() >= 400) {
            throw new IllegalStateException(buildTabscannerErrorMessage(body, failureMessage));
        }
    }

    private String buildTabscannerErrorMessage(JsonNode body, String prefix) {
        String message = readText(body, "message");
        int statusCode = body.path("status_code").asInt();
        if (message == null || message.isBlank()) {
            return prefix;
        }
        if (statusCode > 0) {
            return prefix + " (" + statusCode + "): " + message;
        }
        return prefix + ": " + message;
    }

    private URI buildUri(String baseUrl, String path) {
        String normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return URI.create(normalizedBaseUrl + path);
    }

    private void addFormField(List<byte[]> parts, String boundary, String name, String value) {
        StringBuilder builder = new StringBuilder();
        builder.append("--").append(boundary).append("\r\n");
        builder.append("Content-Disposition: form-data; name=\"").append(name).append("\"\r\n\r\n");
        builder.append(value).append("\r\n");
        parts.add(builder.toString().getBytes(StandardCharsets.UTF_8));
    }

    private void addFileField(List<byte[]> parts, String boundary, String name, String filename, String contentType, byte[] content) {
        StringBuilder builder = new StringBuilder();
        builder.append("--").append(boundary).append("\r\n");
        builder.append("Content-Disposition: form-data; name=\"").append(name).append("\"; filename=\"").append(filename).append("\"\r\n");
        builder.append("Content-Type: ").append(contentType).append("\r\n\r\n");
        parts.add(builder.toString().getBytes(StandardCharsets.UTF_8));
        parts.add(content);
        parts.add("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private void sleep(int millis) {
        try {
            Thread.sleep(Math.max(0, millis));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Oczekiwanie na wynik z Tabscannera zostalo przerwane", ex);
        }
    }

    private BigDecimal readDecimal(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        if (value.isNumber()) {
            return value.decimalValue();
        }
        if (value.isTextual()) {
            try {
                return new BigDecimal(value.asText().replace(',', '.'));
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    private String readText(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text.trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .replaceAll("[^\\p{L}\\p{N}%]+", " ")
            .trim()
            .replaceAll("\\s+", " ")
            .toLowerCase(Locale.ROOT);
    }

    private boolean shouldSkipName(String value) {
        String normalized = normalize(value);
        return SKIP_NAME_FRAGMENTS.stream().anyMatch(normalized::contains);
    }

    private String normalizeFilename(String filename) {
        String sanitized = filename.replaceAll("[^A-Za-z0-9._-]", "_");
        return sanitized.isBlank() ? "receipt.jpg" : sanitized;
    }

    private String normalizeMimeType(String contentType) {
        if ("image/jpg".equals(contentType)) {
            return "image/jpeg";
        }
        return contentType;
    }

    private String replaceExtension(String filename, String extension) {
        String base = normalizeFilename(filename);
        int dotIndex = base.lastIndexOf('.');
        String prefix = dotIndex > 0 ? base.substring(0, dotIndex) : base;
        return prefix + extension;
    }

    private record UploadPayload(byte[] content, String filename, String contentType) {
    }
}
