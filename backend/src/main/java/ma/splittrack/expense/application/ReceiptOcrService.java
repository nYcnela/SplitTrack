package ma.splittrack.expense.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import ma.splittrack.config.AppProperties;
import ma.splittrack.expense.api.dto.ReceiptOcrItemResponse;
import ma.splittrack.expense.api.dto.ReceiptOcrResponse;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ReceiptOcrService {
    private static final Pattern DECIMAL_PATTERN = Pattern.compile("-?\\d+(?:[.,]\\d+)?");

    private final AppProperties appProperties;
    private final ExpenseReceiptStorageService receiptStorageService;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public ReceiptOcrService(
        AppProperties appProperties,
        ExpenseReceiptStorageService receiptStorageService,
        ObjectMapper objectMapper
    ) {
        this.appProperties = appProperties;
        this.receiptStorageService = receiptStorageService;
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) Duration.ofSeconds(10).toMillis());
        requestFactory.setReadTimeout((int) Duration.ofSeconds(appProperties.getOcr().getTimeoutSeconds()).toMillis());
        this.restClient = RestClient.builder()
            .requestFactory(requestFactory)
            .build();
    }

    public ReceiptOcrResponse recognize(List<MultipartFile> files, String requestedLlmType) {
        if (!appProperties.getOcr().isEnabled()) {
            throw new IllegalStateException("Analiza paragonu jest wyłączona w konfiguracji aplikacji");
        }

        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("Wybierz co najmniej jedno zdjęcie paragonu");
        }
        files.forEach(receiptStorageService::validateReceiptImage);

        JsonNode body = sendToReceiptAnalyzer(files, resolveLlmType(requestedLlmType));
        try {
            return mapAnalyzerResponse(body);
        } catch (RuntimeException ex) {
            throw new IllegalStateException("Nie udało się przetworzyć odpowiedzi analizatora paragonu", ex);
        }
    }

    private JsonNode sendToReceiptAnalyzer(List<MultipartFile> files, String llmType) {
        AppProperties.ReceiptAnalyzer analyzer = appProperties.getOcr().getReceiptAnalyzer();
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        files.forEach(file -> body.add("files", new HttpEntity<>(fileResource(file), fileHeaders(file))));

        try {
            String responseBody = restClient.post()
                .uri(buildAnalyzerUri(analyzer.getBaseUrl(), analyzer.getAnalyzePath(), llmType))
                .accept(MediaType.APPLICATION_JSON)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(body)
                .retrieve()
                .body(String.class);
            return objectMapper.readTree(responseBody);
        } catch (IOException ex) {
            throw new IllegalStateException("Nie udało się połączyć z analizatorem paragonu", ex);
        } catch (RestClientResponseException ex) {
            throw new IllegalStateException(
                "Analizator paragonu zwrócił błąd HTTP " + ex.getStatusCode().value()
                    + " dla " + files.size() + " plików: " + ex.getResponseBodyAsString(),
                ex
            );
        } catch (RestClientException ex) {
            throw new IllegalStateException(
                "Nie udało się odebrać odpowiedzi analizatora paragonu w limicie "
                    + appProperties.getOcr().getTimeoutSeconds() + " s",
                ex
            );
        }
    }

    private ByteArrayResource fileResource(MultipartFile file) {
        return new ByteArrayResource(bytes(file)) {
            @Override
            public String getFilename() {
                return originalFilename(file);
            }
        };
    }

    private HttpHeaders fileHeaders(MultipartFile file) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType(file)));
        return headers;
    }

    private String resolveLlmType(String requestedLlmType) {
        String value = requestedLlmType == null || requestedLlmType.isBlank()
            ? appProperties.getOcr().getReceiptAnalyzer().getLlmType()
            : requestedLlmType;
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (!"light".equals(normalized) && !"heavy".equals(normalized)) {
            throw new IllegalArgumentException("llmType musi mieć wartość light albo heavy");
        }
        return normalized;
    }

    private ReceiptOcrResponse mapAnalyzerResponse(JsonNode body) {
        List<ReceiptOcrItemResponse> items = new ArrayList<>();
        JsonNode itemsNode = body.path("items");
        if (itemsNode.isArray()) {
            int maxItems = appProperties.getOcr().getMaxItems();
            for (JsonNode itemNode : itemsNode) {
                if (items.size() >= maxItems) {
                    break;
                }

                String name = text(itemNode, "name");
                BigDecimal priceWithDiscount = decimal(itemNode, "priceWithDiscount");
                BigDecimal totalPrice = decimal(itemNode, "totalPrice");
                BigDecimal unitPrice = decimal(itemNode, "price");
                BigDecimal amount = firstPositive(priceWithDiscount, totalPrice, unitPrice);
                if (name == null || name.isBlank() || amount == null) {
                    continue;
                }

                items.add(new ReceiptOcrItemResponse(
                    name.trim(),
                    amount,
                    name.trim(),
                    decimal(itemNode, "quantity"),
                    decimal(itemNode, "weight"),
                    unitPrice,
                    decimal(itemNode, "discount"),
                    totalPrice,
                    priceWithDiscount
                ));
            }
        }

        JsonNode depositNode = body.path("petDeposit");
        if (depositNode.isObject()) {
            String name = text(depositNode, "name");
            BigDecimal totalPrice = decimal(depositNode, "totalPrice");
            if (name != null && !name.isBlank() && totalPrice != null && totalPrice.compareTo(BigDecimal.ZERO) > 0) {
                items.add(new ReceiptOcrItemResponse(
                    name.trim(),
                    totalPrice,
                    name.trim(),
                    decimal(depositNode, "quantity"),
                    null,
                    decimal(depositNode, "price"),
                    BigDecimal.ZERO,
                    totalPrice,
                    totalPrice
                ));
            }
        }

        return new ReceiptOcrResponse(
            items,
            List.of(),
            "RECEIPT_ANALYZER",
            text(body, "storeName"),
            firstText(body, "data", "date"),
            null,
            decimal(body, "total"),
            text(body, "currency")
        );
    }

    private byte[] bytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new IllegalStateException("Nie udało się odczytać pliku paragonu", ex);
        }
    }

    private URI buildUri(String baseUrl, String path) {
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        return URI.create(normalizedBase + normalizedPath);
    }

    private URI buildAnalyzerUri(String baseUrl, String path, String llmType) {
        URI baseUri = buildUri(baseUrl, path);
        String separator = baseUri.getRawQuery() == null ? "?" : "&";
        String encodedLlmType = URLEncoder.encode(llmType, StandardCharsets.UTF_8);
        return URI.create(baseUri + separator + "llm_type=" + encodedLlmType);
    }

    private String originalFilename(MultipartFile file) {
        String filename = file.getOriginalFilename();
        return filename == null || filename.isBlank() ? "receipt.jpg" : filename;
    }

    private String contentType(MultipartFile file) {
        String contentType = file.getContentType();
        return contentType == null || contentType.isBlank() ? "application/octet-stream" : contentType;
    }

    private BigDecimal firstPositive(BigDecimal... values) {
        for (BigDecimal value : values) {
            if (value != null && value.compareTo(BigDecimal.ZERO) > 0) {
                return value;
            }
        }
        return null;
    }

    private String firstText(JsonNode node, String... fields) {
        for (String field : fields) {
            String value = text(node, field);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text;
    }

    private BigDecimal decimal(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }
        if (value.isNumber()) {
            return value.decimalValue();
        }
        if (value.isTextual() && !value.asText().isBlank()) {
            Matcher matcher = DECIMAL_PATTERN.matcher(value.asText().replace(" ", ""));
            if (matcher.find()) {
                return new BigDecimal(matcher.group().replace(",", "."));
            }
        }
        return null;
    }
}
