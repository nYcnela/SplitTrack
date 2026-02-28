package ma.splittrack.dto;

import java.math.BigDecimal;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.model.Person;
import ma.splittrack.model.Scope;

@Getter
@Setter
@NoArgsConstructor
public class SummaryResponse {
    private Scope scope;
    private DateRangeDTO range;
    private Map<Person, BigDecimal> totalsSpent;
    private BalanceSummaryDTO balance;
    private SettlementDTO lastSettlement;
}
