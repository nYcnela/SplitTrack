package ma.splittrack.summary.api.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.summary.domain.BalanceDirection;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BalanceSummaryDTO {
    private BalanceDirection direction;
    private BigDecimal amountPLN;
}
