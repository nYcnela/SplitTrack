package ma.splittrack.expense.application;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.Optional;
import ma.splittrack.common.domain.LocalDateRange;
import ma.splittrack.common.domain.Scope;
import ma.splittrack.settlement.domain.Settlement;
import ma.splittrack.settlement.infrastructure.SettlementRepository;
import org.springframework.stereotype.Component;

@Component
public class ExpenseScopeResolver {
    private final SettlementRepository settlementRepository;

    public ExpenseScopeResolver(SettlementRepository settlementRepository) {
        this.settlementRepository = settlementRepository;
    }

    public Optional<OffsetDateTime> resolveCycleStart() {
        return settlementRepository.findTopByIsFullTrueOrderByCreatedAtDesc().map(Settlement::getCreatedAt);
    }

    public LocalDateRange resolveExpenseDateRange(Scope scope, YearMonth month, LocalDate dateFrom, LocalDate dateTo) {
        LocalDate from = dateFrom;
        LocalDate to = dateTo;

        if (scope == Scope.MONTH) {
            if (month == null) {
                throw new IllegalArgumentException("month is required for scope=MONTH");
            }
            LocalDate monthStart = month.atDay(1);
            LocalDate monthEnd = month.atEndOfMonth();
            from = from == null ? monthStart : (from.isBefore(monthStart) ? monthStart : from);
            to = to == null ? monthEnd : (to.isAfter(monthEnd) ? monthEnd : to);
        }

        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException("dateFrom cannot be after dateTo");
        }

        return new LocalDateRange(from, to);
    }
}
