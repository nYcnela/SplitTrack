package ma.splittrack.project.api.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record ProjectOrderRequest(@NotEmpty List<Long> projectIds) {}
