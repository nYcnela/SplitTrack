package ma.splittrack.service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.Optional;
import org.springframework.stereotype.Component;
import ma.splittrack.model.LocalDateRange;
import ma.splittrack.model.Scope;
import ma.splittrack.model.Settlement;
import ma.splittrack.repository.SettlementRepository;

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
