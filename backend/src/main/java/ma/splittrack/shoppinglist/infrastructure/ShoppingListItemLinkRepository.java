package ma.splittrack.shoppinglist.infrastructure;

import java.util.List;
import ma.splittrack.shoppinglist.domain.ShoppingListItemLink;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShoppingListItemLinkRepository extends JpaRepository<ShoppingListItemLink, Long> {
    List<ShoppingListItemLink> findByShoppingListItemIdOrderBySortOrderAscIdAsc(Long shoppingListItemId);
    void deleteByShoppingListItemId(Long shoppingListItemId);
}
