package ma.splittrack.summary.domain;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class BalanceResult {
    private final BalanceDirection direction;
    private final BigDecimal amountPLN;
}
