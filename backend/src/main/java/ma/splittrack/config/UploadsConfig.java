package ma.splittrack.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class UploadsConfig implements WebMvcConfigurer {
    private final AppProperties appProperties;

    public UploadsConfig(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadsPath = Paths.get(appProperties.getUploadsDir()).toAbsolutePath().normalize();
        String location = "file:" + uploadsPath + "/";
        registry.addResourceHandler("/uploads/**")
            .addResourceLocations(location);
    }
}
