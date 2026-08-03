package ma.splittrack.shoppinglist.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "shopping_list_items")
@Getter
@Setter
@NoArgsConstructor
public class ShoppingListItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "shopping_list_id", nullable = false)
    private Long shoppingListId;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(name = "price_pln", precision = 12, scale = 2)
    private BigDecimal pricePLN;
    @Column(name = "image_url")
    private String imageUrl;
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
    @CreationTimestamp @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
