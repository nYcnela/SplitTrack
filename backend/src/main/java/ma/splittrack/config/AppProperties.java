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

        @NotBlank
        private String provider = "tesseract";

        @NotBlank
        private String command = "tesseract";

        @NotBlank
        private String language = "pol+eng";

        private int pageSegmentationMode = 6;

        private int timeoutSeconds = 45;

        private int maxItems = 40;

        private Tabscanner tabscanner = new Tabscanner();

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getCommand() {
            return command;
        }

        public void setCommand(String command) {
            this.command = command;
        }

        public String getLanguage() {
            return language;
        }

        public void setLanguage(String language) {
            this.language = language;
        }

        public int getPageSegmentationMode() {
            return pageSegmentationMode;
        }

        public void setPageSegmentationMode(int pageSegmentationMode) {
            this.pageSegmentationMode = pageSegmentationMode;
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

        public String getProvider() {
            return provider;
        }

        public void setProvider(String provider) {
            this.provider = provider;
        }

        public Tabscanner getTabscanner() {
            return tabscanner;
        }

        public void setTabscanner(Tabscanner tabscanner) {
            this.tabscanner = tabscanner;
        }
    }

    public static class Tabscanner {
        @NotBlank
        private String apiBaseUrl = "https://api.tabscanner.com";

        private String apiKey = "";

        @NotBlank
        private String region = "pl";

        @NotBlank
        private String documentType = "receipt";

        @NotBlank
        private String defaultDateParsing = "d/m";

        private int pollDelayMillis = 1000;

        private int maxPollAttempts = 12;

        public String getApiBaseUrl() {
            return apiBaseUrl;
        }

        public void setApiBaseUrl(String apiBaseUrl) {
            this.apiBaseUrl = apiBaseUrl;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getRegion() {
            return region;
        }

        public void setRegion(String region) {
            this.region = region;
        }

        public String getDocumentType() {
            return documentType;
        }

        public void setDocumentType(String documentType) {
            this.documentType = documentType;
        }

        public String getDefaultDateParsing() {
            return defaultDateParsing;
        }

        public void setDefaultDateParsing(String defaultDateParsing) {
            this.defaultDateParsing = defaultDateParsing;
        }

        public int getPollDelayMillis() {
            return pollDelayMillis;
        }

        public void setPollDelayMillis(int pollDelayMillis) {
            this.pollDelayMillis = pollDelayMillis;
        }

        public int getMaxPollAttempts() {
            return maxPollAttempts;
        }

        public void setMaxPollAttempts(int maxPollAttempts) {
            this.maxPollAttempts = maxPollAttempts;
        }
    }
}
