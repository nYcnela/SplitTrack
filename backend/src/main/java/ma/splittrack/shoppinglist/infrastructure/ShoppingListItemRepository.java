package ma.splittrack.shoppinglist.infrastructure;

import java.util.List;
import ma.splittrack.shoppinglist.domain.ShoppingListItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShoppingListItemRepository extends JpaRepository<ShoppingListItem, Long> {
    List<ShoppingListItem> findByShoppingListIdOrderBySortOrderAscIdAsc(Long shoppingListId);
}
