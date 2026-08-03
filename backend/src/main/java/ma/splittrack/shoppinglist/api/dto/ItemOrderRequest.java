package ma.splittrack.shoppinglist.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ItemOrderRequest(@NotNull List<Long> itemIds) {}
