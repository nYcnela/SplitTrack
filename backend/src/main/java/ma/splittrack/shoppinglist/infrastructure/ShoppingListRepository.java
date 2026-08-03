package ma.splittrack.shoppinglist.infrastructure;

import java.util.List;
import ma.splittrack.shoppinglist.domain.ShoppingList;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShoppingListRepository extends JpaRepository<ShoppingList, Long> {
    List<ShoppingList> findAllByOrderBySortOrderAscIdAsc();
}
