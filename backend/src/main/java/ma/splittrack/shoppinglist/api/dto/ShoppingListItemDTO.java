package ma.splittrack.shoppinglist.api.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShoppingListItemDTO {
    private Long id;
    private String title;
    private BigDecimal pricePLN;
    private String imageUrl;
    private Integer sortOrder;
    private List<String> offerUrls;
}
