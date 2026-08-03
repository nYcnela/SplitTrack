package ma.splittrack.shoppinglist.api.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShoppingListDTO {
    private Long id;
    private String name;
    private String description;
    private Integer sortOrder;
    private List<ShoppingListItemDTO> items;
}
