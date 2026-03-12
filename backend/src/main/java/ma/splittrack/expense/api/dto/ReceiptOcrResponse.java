package ma.splittrack.expense.api.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptOcrResponse {
    private List<ReceiptOcrItemResponse> items;
    private List<String> rawLines;
    private String provider;
    private String establishment;
    private String purchaseDate;
    private Integer creditsRemaining;
}
