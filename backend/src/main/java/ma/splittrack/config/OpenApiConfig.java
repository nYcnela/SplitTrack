package ma.splittrack.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "SplitTrack API",
        version = "v1"
    )
)
public class OpenApiConfig {
    @Bean
    public OpenAPI splitTrackOpenAPI() {
        SecurityScheme apiKey = new SecurityScheme()
            .type(SecurityScheme.Type.APIKEY)
            .in(SecurityScheme.In.HEADER)
            .name("X-App-Password");

        return new OpenAPI()
            .addSecurityItem(new SecurityRequirement().addList("AppPassword"))
            .components(new Components().addSecuritySchemes("AppPassword", apiKey));
    }
}
