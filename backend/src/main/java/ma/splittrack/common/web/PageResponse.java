package ma.splittrack.common.web;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PageResponse<T> {
    private List<T> items;
    private PageMeta page;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PageMeta {
        private int pageNumber;
        private int pageSize;
        private long totalElements;
        private int totalPages;
    }
}
