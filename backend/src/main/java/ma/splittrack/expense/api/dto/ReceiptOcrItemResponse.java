package ma.splittrack.expense.api.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptOcrItemResponse {
    private String name;
    private BigDecimal amount;
    private String rawLine;
    private BigDecimal quantity;
    private BigDecimal weight;
    private BigDecimal price;
    private BigDecimal discount;
    private BigDecimal totalPrice;
    private BigDecimal priceWithDiscount;
}
