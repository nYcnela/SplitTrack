package ma.splittrack.shoppinglist.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import ma.splittrack.shoppinglist.api.dto.ShoppingListDTO;
import ma.splittrack.shoppinglist.api.dto.ShoppingListItemDTO;
import ma.splittrack.shoppinglist.api.dto.ShoppingListItemRequest;
import ma.splittrack.shoppinglist.api.dto.ShoppingListRequest;
import ma.splittrack.shoppinglist.domain.ShoppingList;
import ma.splittrack.shoppinglist.domain.ShoppingListItem;
import ma.splittrack.shoppinglist.domain.ShoppingListItemLink;
import ma.splittrack.shoppinglist.infrastructure.ShoppingListItemLinkRepository;
import ma.splittrack.shoppinglist.infrastructure.ShoppingListItemRepository;
import ma.splittrack.shoppinglist.infrastructure.ShoppingListRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShoppingListService {
    private final ShoppingListRepository listRepository;
    private final ShoppingListItemRepository itemRepository;
    private final ShoppingListItemLinkRepository linkRepository;

    public ShoppingListService(ShoppingListRepository listRepository, ShoppingListItemRepository itemRepository, ShoppingListItemLinkRepository linkRepository) {
        this.listRepository = listRepository;
        this.itemRepository = itemRepository;
        this.linkRepository = linkRepository;
    }

    @Transactional(readOnly = true)
    public List<ShoppingListDTO> list() {
        List<ShoppingList> lists = listRepository.findAllByOrderBySortOrderAscIdAsc();
        Map<Long, List<ShoppingListItem>> itemsByList = itemRepository.findAll().stream()
            .collect(Collectors.groupingBy(ShoppingListItem::getShoppingListId));
        return lists.stream().map(list -> toDTO(list, itemsByList.getOrDefault(list.getId(), List.of()))).toList();
    }

    @Transactional
    public ShoppingListDTO createList(ShoppingListRequest request) {
        ShoppingList list = new ShoppingList();
        applyListRequest(list, request);
        list.setSortOrder((int) listRepository.count());
        return toDTO(listRepository.save(list), List.of());
    }

    @Transactional
    public ShoppingListDTO updateList(Long id, ShoppingListRequest request) {
        ShoppingList list = findList(id);
        applyListRequest(list, request);
        return toDTO(list, itemRepository.findByShoppingListIdOrderBySortOrderAscIdAsc(id));
    }

    @Transactional
    public void deleteList(Long id) { listRepository.delete(findList(id)); }

    @Transactional
    public ShoppingListItemDTO createItem(Long listId, ShoppingListItemRequest request) {
        findList(listId);
        ShoppingListItem item = new ShoppingListItem();
        item.setShoppingListId(listId);
        item.setSortOrder(itemRepository.findByShoppingListIdOrderBySortOrderAscIdAsc(listId).size());
        applyItemRequest(item, request);
        ShoppingListItem saved = itemRepository.save(item);
        replaceLinks(saved.getId(), request.getOfferUrls());
        return toItemDTO(saved);
    }

    @Transactional
    public ShoppingListItemDTO updateItem(Long listId, Long itemId, ShoppingListItemRequest request) {
        ShoppingListItem item = findItem(listId, itemId);
        applyItemRequest(item, request);
        replaceLinks(item.getId(), request.getOfferUrls());
        return toItemDTO(item);
    }

    @Transactional
    public void deleteItem(Long listId, Long itemId) { itemRepository.delete(findItem(listId, itemId)); }

    @Transactional
    public void reorderItems(Long listId, List<Long> itemIds) {
        List<ShoppingListItem> items = itemRepository.findByShoppingListIdOrderBySortOrderAscIdAsc(listId);
        if (items.size() != itemIds.size() || !items.stream().map(ShoppingListItem::getId).collect(Collectors.toSet()).equals(new java.util.HashSet<>(itemIds))) {
            throw new IllegalArgumentException("Nieprawidłowa kolejność pozycji listy");
        }
        Map<Long, ShoppingListItem> byId = items.stream().collect(Collectors.toMap(ShoppingListItem::getId, item -> item));
        for (int index = 0; index < itemIds.size(); index++) byId.get(itemIds.get(index)).setSortOrder(index);
    }

    private void applyListRequest(ShoppingList list, ShoppingListRequest request) {
        list.setName(request.getName().trim());
        list.setDescription(normalizeText(request.getDescription()));
    }

    private void applyItemRequest(ShoppingListItem item, ShoppingListItemRequest request) {
        item.setTitle(request.getTitle().trim());
        item.setPricePLN(request.getPricePLN() == null ? null : request.getPricePLN().setScale(2, RoundingMode.HALF_UP));
        item.setImageUrl(normalizeText(request.getImageUrl()));
    }

    private void replaceLinks(Long itemId, List<String> offerUrls) {
        linkRepository.deleteByShoppingListItemId(itemId);
        List<String> links = offerUrls == null ? List.of() : offerUrls.stream().map(this::normalizeText).filter(java.util.Objects::nonNull).toList();
        for (int index = 0; index < links.size(); index++) {
            validateOfferUrl(links.get(index));
            ShoppingListItemLink link = new ShoppingListItemLink();
            link.setShoppingListItemId(itemId); link.setOfferUrl(links.get(index)); link.setSortOrder(index);
            linkRepository.save(link);
        }
    }

    private ShoppingList findList(Long id) { return listRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Lista nie istnieje")); }
    private ShoppingListItem findItem(Long listId, Long itemId) {
        ShoppingListItem item = itemRepository.findById(itemId).orElseThrow(() -> new IllegalArgumentException("Pozycja nie istnieje"));
        if (!item.getShoppingListId().equals(listId)) throw new IllegalArgumentException("Pozycja nie należy do tej listy");
        return item;
    }
    private ShoppingListDTO toDTO(ShoppingList list, List<ShoppingListItem> items) {
        ShoppingListDTO dto = new ShoppingListDTO(); dto.setId(list.getId()); dto.setName(list.getName()); dto.setDescription(list.getDescription()); dto.setSortOrder(list.getSortOrder());
        dto.setItems(items.stream().sorted(java.util.Comparator.comparing(ShoppingListItem::getSortOrder).thenComparing(ShoppingListItem::getId)).map(this::toItemDTO).toList()); return dto;
    }
    private ShoppingListItemDTO toItemDTO(ShoppingListItem item) {
        ShoppingListItemDTO dto = new ShoppingListItemDTO(); dto.setId(item.getId()); dto.setTitle(item.getTitle()); dto.setPricePLN(item.getPricePLN()); dto.setImageUrl(item.getImageUrl()); dto.setSortOrder(item.getSortOrder());
        dto.setOfferUrls(linkRepository.findByShoppingListItemIdOrderBySortOrderAscIdAsc(item.getId()).stream().map(ShoppingListItemLink::getOfferUrl).toList()); return dto;
    }
    private String normalizeText(String value) { if (value == null || value.trim().isEmpty()) return null; return value.trim(); }
    private void validateOfferUrl(String value) { try { URI uri = URI.create(value); if (!"http".equals(uri.getScheme()) && !"https".equals(uri.getScheme())) throw new IllegalArgumentException(); } catch (Exception exception) { throw new IllegalArgumentException("Link oferty musi zaczynać się od http:// lub https://"); } }
}
