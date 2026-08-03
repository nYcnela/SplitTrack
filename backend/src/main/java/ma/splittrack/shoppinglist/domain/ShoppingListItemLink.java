package ma.splittrack.shoppinglist.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "shopping_list_item_links")
@Getter
@Setter
@NoArgsConstructor
public class ShoppingListItemLink {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "shopping_list_item_id", nullable = false)
    private Long shoppingListItemId;
    @Column(name = "offer_url", nullable = false)
    private String offerUrl;
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}
