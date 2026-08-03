package ma.splittrack.shoppinglist.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShoppingListRequest {
    @NotBlank @Size(max = 120)
    private String name;
    @Size(max = 1000)
    private String description;
}
