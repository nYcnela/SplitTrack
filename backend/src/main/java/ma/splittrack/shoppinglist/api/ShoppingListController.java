package ma.splittrack.shoppinglist.api;

import jakarta.validation.Valid;
import java.util.List;
import ma.splittrack.expense.api.dto.ReceiptUploadResponse;
import ma.splittrack.expense.application.ExpenseReceiptStorageService;
import ma.splittrack.shoppinglist.api.dto.ItemOrderRequest;
import ma.splittrack.shoppinglist.api.dto.ShoppingListDTO;
import ma.splittrack.shoppinglist.api.dto.ShoppingListItemDTO;
import ma.splittrack.shoppinglist.api.dto.ShoppingListItemRequest;
import ma.splittrack.shoppinglist.api.dto.ShoppingListRequest;
import ma.splittrack.shoppinglist.application.ShoppingListService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/shopping-lists")
public class ShoppingListController {
    private final ShoppingListService shoppingListService;
    private final ExpenseReceiptStorageService imageStorageService;

    public ShoppingListController(ShoppingListService shoppingListService, ExpenseReceiptStorageService imageStorageService) {
        this.shoppingListService = shoppingListService;
        this.imageStorageService = imageStorageService;
    }

    @GetMapping public List<ShoppingListDTO> list() { return shoppingListService.list(); }
    @PostMapping public ShoppingListDTO create(@Valid @RequestBody ShoppingListRequest request) { return shoppingListService.createList(request); }
    @PutMapping("/{listId}") public ShoppingListDTO update(@PathVariable("listId") Long listId, @Valid @RequestBody ShoppingListRequest request) { return shoppingListService.updateList(listId, request); }
    @DeleteMapping("/{listId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable("listId") Long listId) { shoppingListService.deleteList(listId); }
    @PostMapping("/{listId}/items") public ShoppingListItemDTO createItem(@PathVariable("listId") Long listId, @Valid @RequestBody ShoppingListItemRequest request) { return shoppingListService.createItem(listId, request); }
    @PutMapping("/{listId}/items/{itemId}") public ShoppingListItemDTO updateItem(@PathVariable("listId") Long listId, @PathVariable("itemId") Long itemId, @Valid @RequestBody ShoppingListItemRequest request) { return shoppingListService.updateItem(listId, itemId, request); }
    @DeleteMapping("/{listId}/items/{itemId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteItem(@PathVariable("listId") Long listId, @PathVariable("itemId") Long itemId) { shoppingListService.deleteItem(listId, itemId); }
    @PutMapping("/{listId}/items/order") @ResponseStatus(HttpStatus.NO_CONTENT) public void reorder(@PathVariable("listId") Long listId, @Valid @RequestBody ItemOrderRequest request) { shoppingListService.reorderItems(listId, request.itemIds()); }
    @PostMapping(value = "/images", consumes = "multipart/form-data") public ReceiptUploadResponse uploadImage(@RequestPart("file") MultipartFile file) { return new ReceiptUploadResponse(imageStorageService.store(file)); }
}
