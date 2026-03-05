package ma.splittrack.expense.application;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import ma.splittrack.config.AppProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ExpenseReceiptStorageService {
    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
    );

    private final AppProperties appProperties;

    public ExpenseReceiptStorageService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Plik paragonu jest pusty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("Zdjęcie paragonu jest za duże (max 10 MB)");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Dozwolone formaty paragonu: JPG, PNG, WEBP, GIF");
        }

        String safeOriginalName = sanitizeFilename(file.getOriginalFilename());
        String generatedName = UUID.randomUUID() + "_" + safeOriginalName;

        Path uploadsDir = Paths.get(appProperties.getUploadsDir()).toAbsolutePath().normalize();
        Path target = uploadsDir.resolve(generatedName).normalize();
        if (!target.startsWith(uploadsDir)) {
            throw new IllegalArgumentException("Nieprawidłowa nazwa pliku");
        }

        try {
            Files.createDirectories(uploadsDir);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Nie udało się zapisać zdjęcia paragonu", ex);
        }

        return "/uploads/" + generatedName;
    }

    private String sanitizeFilename(String originalName) {
        String fallback = "receipt.jpg";
        if (originalName == null || originalName.isBlank()) {
            return fallback;
        }
        String cleaned = originalName.trim().replaceAll("[^a-zA-Z0-9._-]", "_");
        return cleaned.isBlank() ? fallback : cleaned;
    }
}
