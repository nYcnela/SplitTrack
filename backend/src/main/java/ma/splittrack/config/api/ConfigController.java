package ma.splittrack.config.api;

import java.util.List;
import ma.splittrack.common.domain.Person;
import ma.splittrack.config.AppProperties;
import ma.splittrack.config.api.dto.PersonOption;
import ma.splittrack.config.api.dto.PublicConfigResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/config")
public class ConfigController {
    private final AppProperties appProperties;

    public ConfigController(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @GetMapping("/public")
    public PublicConfigResponse getPublicConfig() {
        List<PersonOption> persons = List.of(
            new PersonOption(Person.MACIEK.name(), "Maciek"),
            new PersonOption(Person.EMILKA.name(), "Emilka")
        );
        return new PublicConfigResponse(persons, appProperties.getDefaultCurrency());
    }
}
