package ma.splittrack.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String password = "";

    private Cors cors = new Cors();

    @NotBlank
    private String defaultCurrency = "PLN";

    @NotBlank
    private String uploadsDir = "uploads";

    @NotNull
    private DataSize maxUploadSize = DataSize.ofMegabytes(10);

    private Ocr ocr = new Ocr();

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Cors getCors() {
        return cors;
    }

    public void setCors(Cors cors) {
        this.cors = cors;
    }

    public String getDefaultCurrency() {
        return defaultCurrency;
    }

    public void setDefaultCurrency(String defaultCurrency) {
        this.defaultCurrency = defaultCurrency;
    }

    public String getUploadsDir() {
        return uploadsDir;
    }

    public void setUploadsDir(String uploadsDir) {
        this.uploadsDir = uploadsDir;
    }

    public DataSize getMaxUploadSize() {
        return maxUploadSize;
    }

    public void setMaxUploadSize(DataSize maxUploadSize) {
        this.maxUploadSize = maxUploadSize;
    }

    public Ocr getOcr() {
        return ocr;
    }

    public void setOcr(Ocr ocr) {
        this.ocr = ocr;
    }

    public static class Cors {
        private String allowedOrigins = "*";

        public String getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(String allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class Ocr {
        private boolean enabled = true;

        private int timeoutSeconds = 180;

        private int maxItems = 40;

        private ReceiptAnalyzer receiptAnalyzer = new ReceiptAnalyzer();

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public int getTimeoutSeconds() {
            return timeoutSeconds;
        }

        public void setTimeoutSeconds(int timeoutSeconds) {
            this.timeoutSeconds = timeoutSeconds;
        }

        public int getMaxItems() {
            return maxItems;
        }

        public void setMaxItems(int maxItems) {
            this.maxItems = maxItems;
        }

        public ReceiptAnalyzer getReceiptAnalyzer() {
            return receiptAnalyzer;
        }

        public void setReceiptAnalyzer(ReceiptAnalyzer receiptAnalyzer) {
            this.receiptAnalyzer = receiptAnalyzer;
        }
    }

    public static class ReceiptAnalyzer {
        @NotBlank
        private String baseUrl = "http://localhost:8000";

        @NotBlank
        private String analyzePath = "/receipt/analyze";

        @NotBlank
        private String llmType = "light";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getAnalyzePath() {
            return analyzePath;
        }

        public void setAnalyzePath(String analyzePath) {
            this.analyzePath = analyzePath;
        }

        public String getLlmType() {
            return llmType;
        }

        public void setLlmType(String llmType) {
            this.llmType = llmType;
        }
    }
}
