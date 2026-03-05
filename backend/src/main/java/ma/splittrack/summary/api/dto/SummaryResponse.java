package ma.splittrack.summary.api.dto;

import java.math.BigDecimal;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.common.domain.Person;
import ma.splittrack.common.domain.Scope;
import ma.splittrack.settlement.api.dto.SettlementDTO;

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
