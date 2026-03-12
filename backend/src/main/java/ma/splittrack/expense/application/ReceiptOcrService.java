package ma.splittrack.expense.application;

import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.awt.image.Raster;
import java.awt.image.WritableRaster;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.MatchResult;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.imageio.ImageIO;
import ma.splittrack.config.AppProperties;
import ma.splittrack.expense.api.dto.ReceiptOcrItemResponse;
import ma.splittrack.expense.api.dto.ReceiptOcrResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ReceiptOcrService {
    private static final BigDecimal MAX_LINE_AMOUNT = new BigDecimal("5000");
    private static final int TARGET_MIN_WIDTH = 1800;
    private static final int TARGET_MAX_WIDTH = 2400;
    private static final int CROP_MARGIN = 20;
    private static final Pattern PRICE_PATTERN = Pattern.compile("(?<!\\d)(\\d{1,5}[.,]\\d{2})(?!\\d)");
    private static final Pattern MULTI_SPACE_PATTERN = Pattern.compile("\\s+");
    private static final Pattern LEADING_QUANTITY_PATTERN = Pattern.compile("^[\\d.,xX*\\-\\s]{1,16}");
    private static final Pattern NON_NAME_CHAR_PATTERN = Pattern.compile("[^\\p{L}\\p{N}%/&+\\-.,() ]");
    private static final Pattern TRAILING_CLASS_MARKER_PATTERN = Pattern.compile("\\s+\\(?[A-Z]\\)?$");
    private static final Pattern TRAILING_UNIT_PRICE_PATTERN = Pattern.compile("\\s+\\d+\\s*[xX]\\s*\\d{1,5}[.,]\\d{2}$");
    private static final Pattern TRAILING_QUANTITY_FRAGMENT_PATTERN = Pattern.compile("\\s+\\d+\\s*[xX]$");
    private static final Pattern PRICE_LINE_REMAINDER_PATTERN = Pattern.compile("[\\dxX*.,()\\-\\s]+");
    private static final Set<String> SKIP_KEYWORDS = Set.of(
        "suma",
        "suma pln",
        "razem",
        "total",
        "platnosc",
        "rozliczenie",
        "gotowka",
        "karta",
        "reszta",
        "rabat",
        "opust",
        "podatek",
        "vat",
        "ptu",
        "paragon",
        "fiskalny",
        "niefiskalny",
        "nip",
        "sprzedaz",
        "opodatkowana",
        "terminal",
        "blik",
        "visa",
        "mastercard"
    );

    private final AppProperties appProperties;
    private final ExpenseReceiptStorageService receiptStorageService;
    private final TabscannerReceiptOcrService tabscannerReceiptOcrService;

    public ReceiptOcrService(
        AppProperties appProperties,
        ExpenseReceiptStorageService receiptStorageService,
        TabscannerReceiptOcrService tabscannerReceiptOcrService
    ) {
        this.appProperties = appProperties;
        this.receiptStorageService = receiptStorageService;
        this.tabscannerReceiptOcrService = tabscannerReceiptOcrService;
    }

    public ReceiptOcrResponse recognize(MultipartFile file) {
        if (!appProperties.getOcr().isEnabled()) {
            throw new IllegalStateException("OCR paragonu jest wyłączony w konfiguracji aplikacji");
        }

        receiptStorageService.validateReceiptImage(file);
        if ("tabscanner".equalsIgnoreCase(appProperties.getOcr().getProvider())) {
            return tabscannerReceiptOcrService.recognize(file);
        }

        return recognizeWithTesseract(file);
    }

    private ReceiptOcrResponse recognizeWithTesseract(MultipartFile file) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("splittrack-ocr-");
            Path inputPath = tempDir.resolve("receipt" + detectExtension(file));
            file.transferTo(inputPath);

            ProcessedImages processedImages = preprocessImage(inputPath, tempDir);
            Map<String, ReceiptOcrItemResponse> dedupedItems = new LinkedHashMap<>();
            LinkedHashSet<String> rawLines = new LinkedHashSet<>();

            List<OcrLine> binaryLines = recognizeLines(
                processedImages.binaryImagePath,
                tempDir.resolve("ocr-binary"),
                6
            );
            mergeRawLines(rawLines, binaryLines);
            mergeItems(dedupedItems, parseItems(binaryLines));

            if (dedupedItems.size() < appProperties.getOcr().getMaxItems()) {
                List<OcrLine> grayLines = recognizeLines(
                    processedImages.grayImagePath,
                    tempDir.resolve("ocr-gray"),
                    4
                );
                mergeRawLines(rawLines, grayLines);
                mergeItems(dedupedItems, parseItems(grayLines));
            }

            if (dedupedItems.size() < appProperties.getOcr().getMaxItems()) {
                List<OcrLine> sparseLines = recognizeLines(
                    processedImages.originalImagePath,
                    tempDir.resolve("ocr-sparse"),
                    11
                );
                mergeRawLines(rawLines, sparseLines);
                mergeItems(dedupedItems, parseItems(sparseLines));
            }

            if (dedupedItems.size() < appProperties.getOcr().getMaxItems()) {
                List<OcrLine> originalLines = recognizeLines(
                    processedImages.originalImagePath,
                    tempDir.resolve("ocr-original"),
                    appProperties.getOcr().getPageSegmentationMode()
                );
                mergeRawLines(rawLines, originalLines);
                mergeItems(dedupedItems, parseItems(originalLines));
            }

            return new ReceiptOcrResponse(
                new ArrayList<>(dedupedItems.values()),
                new ArrayList<>(rawLines),
                "TESSERACT",
                null,
                null,
                null
            );
        } catch (IOException ex) {
            throw new IllegalStateException("Nie udało się przygotować pliku paragonu do OCR", ex);
        } finally {
            deleteRecursively(tempDir);
        }
    }

    private ProcessedImages preprocessImage(Path inputPath, Path tempDir) throws IOException {
        BufferedImage source = ImageIO.read(inputPath.toFile());
        if (source == null) {
            return new ProcessedImages(inputPath, inputPath, inputPath);
        }

        BufferedImage scaled = scaleImage(source);
        BufferedImage gray = new BufferedImage(scaled.getWidth(), scaled.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D graphics = gray.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.drawImage(scaled, 0, 0, null);
        graphics.dispose();

        stretchContrast(gray);

        int threshold = computeOtsuThreshold(gray);
        BufferedImage binary = createBinaryImage(gray, threshold);
        Rectangle cropBounds = findContentBounds(binary);
        BufferedImage croppedGray = cropImage(gray, cropBounds);
        BufferedImage croppedBinary = cropImage(binary, cropBounds);

        Path grayPath = tempDir.resolve("receipt-gray.png");
        Path binaryPath = tempDir.resolve("receipt-binary.png");
        ImageIO.write(croppedGray, "png", grayPath.toFile());
        ImageIO.write(croppedBinary, "png", binaryPath.toFile());

        return new ProcessedImages(inputPath, grayPath, binaryPath);
    }

    private BufferedImage scaleImage(BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        double scale = 1.0d;

        if (width < TARGET_MIN_WIDTH) {
            scale = (double) TARGET_MIN_WIDTH / width;
        } else if (width > TARGET_MAX_WIDTH) {
            scale = (double) TARGET_MAX_WIDTH / width;
        }

        if (Math.abs(scale - 1.0d) < 0.01d) {
            return source;
        }

        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));
        BufferedImage scaled = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);

        Graphics2D graphics = scaled.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        graphics.dispose();
        return scaled;
    }

    private void stretchContrast(BufferedImage gray) {
        WritableRaster raster = gray.getRaster();
        int width = gray.getWidth();
        int height = gray.getHeight();
        int min = 255;
        int max = 0;

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int value = raster.getSample(x, y, 0);
                min = Math.min(min, value);
                max = Math.max(max, value);
            }
        }

        if (max - min < 24) {
            return;
        }

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int value = raster.getSample(x, y, 0);
                int stretched = (value - min) * 255 / (max - min);
                raster.setSample(x, y, 0, Math.max(0, Math.min(255, stretched)));
            }
        }
    }

    private int computeOtsuThreshold(BufferedImage gray) {
        int[] histogram = new int[256];
        Raster raster = gray.getRaster();
        int width = gray.getWidth();
        int height = gray.getHeight();

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                histogram[raster.getSample(x, y, 0)]++;
            }
        }

        int total = width * height;
        long sum = 0;
        for (int i = 0; i < histogram.length; i++) {
            sum += (long) i * histogram[i];
        }

        long backgroundSum = 0;
        int backgroundWeight = 0;
        double maxVariance = -1;
        int threshold = 127;

        for (int i = 0; i < histogram.length; i++) {
            backgroundWeight += histogram[i];
            if (backgroundWeight == 0) {
                continue;
            }

            int foregroundWeight = total - backgroundWeight;
            if (foregroundWeight == 0) {
                break;
            }

            backgroundSum += (long) i * histogram[i];
            double backgroundMean = (double) backgroundSum / backgroundWeight;
            double foregroundMean = (double) (sum - backgroundSum) / foregroundWeight;
            double variance = (double) backgroundWeight * foregroundWeight
                * (backgroundMean - foregroundMean) * (backgroundMean - foregroundMean);

            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = i;
            }
        }

        return threshold;
    }

    private BufferedImage createBinaryImage(BufferedImage gray, int threshold) {
        int width = gray.getWidth();
        int height = gray.getHeight();
        BufferedImage binary = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_BINARY);
        Raster grayRaster = gray.getRaster();

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int value = grayRaster.getSample(x, y, 0);
                binary.setRGB(x, y, value <= threshold ? 0xFF000000 : 0xFFFFFFFF);
            }
        }

        return binary;
    }

    private Rectangle findContentBounds(BufferedImage binary) {
        int width = binary.getWidth();
        int height = binary.getHeight();
        int minX = width;
        int minY = height;
        int maxX = -1;
        int maxY = -1;

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                if ((binary.getRGB(x, y) & 0x00FFFFFF) == 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (maxX < 0 || maxY < 0) {
            return new Rectangle(0, 0, width, height);
        }

        int cropX = Math.max(0, minX - CROP_MARGIN);
        int cropY = Math.max(0, minY - CROP_MARGIN);
        int cropWidth = Math.min(width - cropX, (maxX - minX) + 1 + (CROP_MARGIN * 2));
        int cropHeight = Math.min(height - cropY, (maxY - minY) + 1 + (CROP_MARGIN * 2));
        return new Rectangle(cropX, cropY, cropWidth, cropHeight);
    }

    private BufferedImage cropImage(BufferedImage source, Rectangle bounds) {
        return source.getSubimage(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    private List<OcrLine> recognizeLines(Path inputPath, Path outputBase, int psm) throws IOException {
        List<String> command = List.of(
            appProperties.getOcr().getCommand(),
            inputPath.toString(),
            outputBase.toString(),
            "-l",
            appProperties.getOcr().getLanguage(),
            "--psm",
            Integer.toString(psm),
            "-c",
            "preserve_interword_spaces=1",
            "tsv"
        );

        ProcessBuilder processBuilder = new ProcessBuilder(command);
        processBuilder.redirectErrorStream(true);

        Process process;
        try {
            process = processBuilder.start();
        } catch (IOException ex) {
            throw new IllegalStateException(
                "OCR jest niedostępny. Zainstaluj Tesseract oraz pakiet językowy polskiego OCR na hoście.",
                ex
            );
        }

        StringBuilder processOutput = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8)
        )) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (processOutput.length() > 0) {
                    processOutput.append('\n');
                }
                processOutput.append(line);
            }
        }

        waitForCompletion(process, Duration.ofSeconds(appProperties.getOcr().getTimeoutSeconds()));
        if (process.exitValue() != 0) {
            String details = processOutput.toString().trim();
            String suffix = details.isBlank() ? "" : ": " + details;
            throw new IllegalStateException("Nie udało się odczytać paragonu przez OCR" + suffix);
        }

        Path outputFile = Path.of(outputBase + ".tsv");
        if (!Files.exists(outputFile)) {
            throw new IllegalStateException("OCR nie zwrócił danych TSV dla paragonu");
        }

        return parseTsvLines(outputFile);
    }

    private void waitForCompletion(Process process, Duration timeout) {
        try {
            boolean finished = process.waitFor(timeout.toSeconds(), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException("OCR paragonu przekroczył limit czasu");
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
            throw new IllegalStateException("OCR paragonu został przerwany", ex);
        }
    }

    private List<OcrLine> parseTsvLines(Path tsvPath) throws IOException {
        List<OcrWord> words = new ArrayList<>();

        for (String rawLine : Files.readAllLines(tsvPath, StandardCharsets.UTF_8)) {
            if (rawLine.startsWith("level\t")) {
                continue;
            }

            String[] columns = rawLine.split("\t", 12);
            if (columns.length < 12 || !"5".equals(columns[0])) {
                continue;
            }

            String text = normalizeWhitespace(columns[11]);
            if (text.isBlank()) {
                continue;
            }

            int left = parseInt(columns[6]);
            int top = parseInt(columns[7]);
            int width = parseInt(columns[8]);
            int height = parseInt(columns[9]);
            int confidence = parseInt(columns[10]);
            if (confidence >= 0) {
                words.add(new OcrWord(text, left, top, width, height, confidence));
            }
        }

        return clusterWordsIntoLines(words).stream()
            .filter(line -> !line.text.isBlank())
            .sorted(Comparator.comparingInt((OcrLine line) -> line.top).thenComparingInt(line -> line.left))
            .toList();
    }

    private List<OcrLine> clusterWordsIntoLines(List<OcrWord> words) {
        List<OcrWord> sortedWords = new ArrayList<>(words);
        sortedWords.sort(Comparator.comparingInt(OcrWord::centerY).thenComparingInt(word -> word.left));

        List<OcrLineBuilder> builders = new ArrayList<>();
        for (OcrWord word : sortedWords) {
            OcrLineBuilder bestBuilder = null;
            int bestDistance = Integer.MAX_VALUE;

            for (OcrLineBuilder builder : builders) {
                int distance = Math.abs(builder.centerY() - word.centerY());
                int allowed = (int) Math.round(Math.max(builder.averageHeight(), word.height) * 0.8);
                if (distance <= allowed && distance < bestDistance) {
                    bestBuilder = builder;
                    bestDistance = distance;
                }
            }

            if (bestBuilder == null) {
                bestBuilder = new OcrLineBuilder();
                builders.add(bestBuilder);
            }

            bestBuilder.addWord(word);
        }

        return builders.stream()
            .map(OcrLineBuilder::build)
            .toList();
    }

    private List<ReceiptOcrItemResponse> parseItems(List<OcrLine> lines) {
        List<ReceiptOcrItemResponse> items = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();

        for (int index = 0; index < lines.size(); index++) {
            OcrLine current = lines.get(index);
            if (current.text.isBlank() || shouldSkipLine(current.text)) {
                continue;
            }

            ParsedCandidate candidate = parseSameLineCandidate(current);

            if (candidate == null && containsLetters(current.text) && index + 1 < lines.size()) {
                OcrLine next = lines.get(index + 1);
                if (isNearby(current, next) && looksLikePriceOnlyLine(next.text) && !shouldSkipLine(next.text)) {
                    candidate = parseSplitLineCandidate(current, next);
                }
            }

            if (candidate == null && containsPrice(current.text) && !containsLetters(current.text) && index > 0) {
                OcrLine previous = lines.get(index - 1);
                if (isNearby(previous, current) && containsLetters(previous.text) && !shouldSkipLine(previous.text)) {
                    candidate = parseSplitLineCandidate(previous, current);
                }
            }

            if (candidate == null) {
                continue;
            }

            String dedupeKey = normalizeForMatching(candidate.name) + "|" + candidate.amount.toPlainString();
            if (!seen.add(dedupeKey)) {
                continue;
            }

            items.add(new ReceiptOcrItemResponse(candidate.name, candidate.amount, candidate.rawLine));
            if (items.size() >= appProperties.getOcr().getMaxItems()) {
                break;
            }
        }

        return items;
    }

    private ParsedCandidate parseSameLineCandidate(OcrLine line) {
        List<MatchResult> priceMatches = findPrices(line.text);
        if (priceMatches.isEmpty()) {
            return null;
        }

        MatchResult lastPrice = priceMatches.get(priceMatches.size() - 1);
        String namePart = line.text.substring(0, lastPrice.start());
        return buildCandidate(namePart, lastPrice.group(1), line.text);
    }

    private ParsedCandidate parseSplitLineCandidate(OcrLine nameLine, OcrLine priceLine) {
        List<MatchResult> priceMatches = findPrices(priceLine.text);
        if (priceMatches.isEmpty()) {
            return null;
        }

        MatchResult lastPrice = priceMatches.get(priceMatches.size() - 1);
        return buildCandidate(nameLine.text, lastPrice.group(1), nameLine.text + " | " + priceLine.text);
    }

    private ParsedCandidate buildCandidate(String nameSource, String amountText, String rawLine) {
        BigDecimal amount = parseAmount(amountText);
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0 || amount.compareTo(MAX_LINE_AMOUNT) > 0) {
            return null;
        }

        String name = cleanupName(nameSource);
        if (name.isBlank() || !containsLetters(name) || shouldSkipLine(name)) {
            return null;
        }

        return new ParsedCandidate(name, amount, normalizeWhitespace(rawLine));
    }

    private List<MatchResult> findPrices(String line) {
        Matcher matcher = PRICE_PATTERN.matcher(line);
        List<MatchResult> matches = new ArrayList<>();
        while (matcher.find()) {
            matches.add(matcher.toMatchResult());
        }
        return matches;
    }

    private BigDecimal parseAmount(String amountText) {
        try {
            return new BigDecimal(amountText.replace(',', '.'));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String cleanupName(String name) {
        String cleaned = normalizeWhitespace(name);
        cleaned = LEADING_QUANTITY_PATTERN.matcher(cleaned).replaceFirst("");
        cleaned = TRAILING_UNIT_PRICE_PATTERN.matcher(cleaned).replaceFirst("");
        cleaned = TRAILING_QUANTITY_FRAGMENT_PATTERN.matcher(cleaned).replaceFirst("");
        cleaned = TRAILING_CLASS_MARKER_PATTERN.matcher(cleaned).replaceFirst("");
        cleaned = NON_NAME_CHAR_PATTERN.matcher(cleaned).replaceAll(" ");
        cleaned = normalizeWhitespace(cleaned);
        cleaned = TRAILING_CLASS_MARKER_PATTERN.matcher(cleaned).replaceFirst("");
        return normalizeWhitespace(cleaned);
    }

    private boolean looksLikePriceOnlyLine(String line) {
        if (!containsPrice(line)) {
            return false;
        }

        String withoutPrices = PRICE_PATTERN.matcher(line).replaceAll(" ");
        String remainder = withoutPrices
            .replace('×', 'x')
            .replaceAll("\\b[ABCDEFGP]\\b", " ")
            .replaceAll("[xX*()\\-\\s]", " ");
        remainder = PRICE_LINE_REMAINDER_PATTERN.matcher(remainder).replaceAll(" ");
        remainder = normalizeWhitespace(remainder);
        return remainder.isBlank() || !containsLetters(remainder);
    }

    private boolean containsPrice(String value) {
        return PRICE_PATTERN.matcher(value).find();
    }

    private boolean shouldSkipLine(String line) {
        String normalized = normalizeForMatching(line);
        return SKIP_KEYWORDS.stream().anyMatch(normalized::contains);
    }

    private boolean containsLetters(String value) {
        return value.chars().anyMatch(Character::isLetter);
    }

    private boolean isNearby(OcrLine first, OcrLine second) {
        int centerDistance = Math.abs(first.centerY() - second.centerY());
        int allowed = (int) Math.round(Math.max(first.height, second.height) * 1.7);
        int gap = second.top - first.bottom;
        return centerDistance <= allowed || gap <= allowed;
    }

    private void mergeItems(Map<String, ReceiptOcrItemResponse> target, List<ReceiptOcrItemResponse> incoming) {
        for (ReceiptOcrItemResponse item : incoming) {
            if (target.size() >= appProperties.getOcr().getMaxItems()) {
                return;
            }

            String key = normalizeForMatching(item.getName()) + "|" + item.getAmount().toPlainString();
            target.putIfAbsent(key, item);
        }
    }

    private void mergeRawLines(Set<String> target, List<OcrLine> incoming) {
        for (OcrLine line : incoming) {
            String normalized = normalizeWhitespace(line.text);
            if (!normalized.isBlank()) {
                target.add(normalized);
            }
        }
    }

    private String normalizeWhitespace(String value) {
        return MULTI_SPACE_PATTERN.matcher(value == null ? "" : value.trim()).replaceAll(" ");
    }

    private String normalizeForMatching(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .toLowerCase(Locale.ROOT);
        return normalizeWhitespace(normalized);
    }

    private int parseInt(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private String detectExtension(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        if (originalName != null) {
            int idx = originalName.lastIndexOf('.');
            if (idx >= 0 && idx < originalName.length() - 1) {
                String ext = originalName.substring(idx);
                if (ext.length() <= 6) {
                    return ext.toLowerCase(Locale.ROOT);
                }
            }
        }

        String contentType = file.getContentType();
        if ("image/png".equalsIgnoreCase(contentType)) {
            return ".png";
        }
        if ("image/webp".equalsIgnoreCase(contentType)) {
            return ".webp";
        }
        if ("image/gif".equalsIgnoreCase(contentType)) {
            return ".gif";
        }
        return ".jpg";
    }

    private void deleteRecursively(Path path) {
        if (path == null) {
            return;
        }

        try (var stream = Files.walk(path)) {
            stream.sorted((left, right) -> right.compareTo(left)).forEach(current -> {
                try {
                    Files.deleteIfExists(current);
                } catch (IOException ignored) {
                    // Ignore cleanup issues for temporary OCR files.
                }
            });
        } catch (IOException ignored) {
            // Ignore cleanup issues for temporary OCR files.
        }
    }

    private record ProcessedImages(Path originalImagePath, Path grayImagePath, Path binaryImagePath) {
    }

    private record ParsedCandidate(String name, BigDecimal amount, String rawLine) {
    }

    private static final class OcrLine {
        private final String text;
        private final int left;
        private final int top;
        private final int bottom;
        private final int height;

        private OcrLine(String text, int left, int top, int bottom, int height) {
            this.text = text;
            this.left = left;
            this.top = top;
            this.bottom = bottom;
            this.height = height;
        }

        private int centerY() {
            return top + (height / 2);
        }
    }

    private static final class OcrLineBuilder {
        private final List<OcrWord> words = new ArrayList<>();

        private void addWord(OcrWord word) {
            words.add(word);
        }

        private void addWord(String text, int left, int top, int width, int height, int confidence) {
            words.add(new OcrWord(text, left, top, width, height, confidence));
        }

        private OcrLine build() {
            words.sort(Comparator.comparingInt((OcrWord word) -> word.left).thenComparingInt(word -> word.top));

            StringBuilder text = new StringBuilder();
            int left = Integer.MAX_VALUE;
            int top = Integer.MAX_VALUE;
            int right = Integer.MIN_VALUE;
            int bottom = Integer.MIN_VALUE;

            for (OcrWord word : words) {
                if (text.length() > 0) {
                    text.append(' ');
                }
                text.append(word.text);
                left = Math.min(left, word.left);
                top = Math.min(top, word.top);
                right = Math.max(right, word.left + word.width);
                bottom = Math.max(bottom, word.top + word.height);
            }

            if (left == Integer.MAX_VALUE) {
                left = 0;
                top = 0;
                right = 0;
                bottom = 0;
            }

            return new OcrLine(text.toString(), left, top, bottom, Math.max(1, bottom - top));
        }

        private int centerY() {
            if (words.isEmpty()) {
                return 0;
            }
            return words.stream().mapToInt(OcrWord::centerY).sum() / words.size();
        }

        private double averageHeight() {
            if (words.isEmpty()) {
                return 0;
            }
            return words.stream().mapToInt(word -> word.height).average().orElse(0);
        }
    }

    private record OcrWord(String text, int left, int top, int width, int height, int confidence) {
        private int centerY() {
            return top + (height / 2);
        }
    }
}
