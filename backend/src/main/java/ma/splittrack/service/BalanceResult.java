package ma.splittrack.service;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;
import ma.splittrack.model.BalanceDirection;

@Getter
@AllArgsConstructor
public class BalanceResult {
    private final BalanceDirection direction;
    private final BigDecimal amountPLN;
}
