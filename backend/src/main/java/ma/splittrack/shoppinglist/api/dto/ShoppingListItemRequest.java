package ma.splittrack.shoppinglist.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShoppingListItemRequest {
    @NotBlank @Size(max = 200)
    private String title;
    @DecimalMin(value = "0.00")
    private BigDecimal pricePLN;
    @Size(max = 2000)
    private String imageUrl;
    @Size(max = 12)
    private List<@Size(max = 2000) String> offerUrls;
}
