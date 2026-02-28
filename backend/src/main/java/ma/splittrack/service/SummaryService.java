package ma.splittrack.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import ma.splittrack.dto.BalanceSummaryDTO;
import ma.splittrack.dto.DateRangeDTO;
import ma.splittrack.dto.SpendingChartResponse;
import ma.splittrack.dto.SummaryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ma.splittrack.model.LocalDateRange;
import ma.splittrack.model.Person;
import ma.splittrack.model.Scope;
import ma.splittrack.model.Expense;
import ma.splittrack.repository.ExpenseRepository;
import ma.splittrack.repository.ExpenseSpecifications;
import ma.splittrack.model.Settlement;
import ma.splittrack.repository.SettlementRepository;

@Service
public class SummaryService {
    private final ExpenseRepository expenseRepository;
    private final SettlementRepository settlementRepository;
    private final ExpenseScopeResolver scopeResolver;
    private final BalanceCalculator balanceCalculator;
    private final SettlementService settlementService;

    public SummaryService(ExpenseRepository expenseRepository,
                          SettlementRepository settlementRepository,
                          ExpenseScopeResolver scopeResolver,
                          BalanceCalculator balanceCalculator,
                          SettlementService settlementService) {
        this.expenseRepository = expenseRepository;
        this.settlementRepository = settlementRepository;
        this.scopeResolver = scopeResolver;
        this.balanceCalculator = balanceCalculator;
        this.settlementService = settlementService;
    }

    @Transactional(readOnly = true)
    public SummaryResponse getSummary(Scope scope, YearMonth month) {
        OffsetDateTime cycleStart = scope == Scope.CYCLE ? scopeResolver.resolveCycleStart().orElse(null) : null;
        boolean futureMonth = scope == Scope.MONTH && month != null && month.isAfter(YearMonth.now());

        // For CYCLE, filter expenses by expenseDate >= cycleStartDate.
        // This ensures that backdated expenses (entered after the full settlement but dated before it)
        // are correctly excluded from the current cycle.
        LocalDate cycleStartDate = (scope == Scope.CYCLE && cycleStart != null)
            ? cycleStart.toLocalDate()
            : null;

        LocalDateRange dateRange = buildExpenseDateRange(scope, month, cycleStartDate);

        // For CYCLE, no createdAt filter — rely purely on expenseDate range.
        // For other scopes, no createdAt filter either (unused).
        List<Expense> expenses = futureMonth
            ? List.of()
            : expenseRepository.findAll(ExpenseSpecifications.build(null, dateRange, null));

        // For balance calculation, always pass ALL settlements so the full-settlement
        // reset logic in BalanceCalculator can correctly zero out prior debt.
        List<Settlement> settlements;
        if (futureMonth) {
            settlements = List.of();
        } else {
            List<Settlement> allSettlements = settlementRepository.findAll();
            // For MONTH scope, only include settlements within that month.
            settlements = loadSettlementsForScope(scope, month, allSettlements);
        }

        Map<Person, BigDecimal> totals = initTotals();
        for (Expense expense : expenses) {
            totals.compute(expense.getPayer(), (key, value) -> value.add(expense.getAmountPLN()));
        }

        BigDecimal net = balanceCalculator.calculateNet(expenses, settlements);
        BalanceResult balanceResult = balanceCalculator.toBalanceResult(net);

        SummaryResponse response = new SummaryResponse();
        response.setScope(scope);
        response.setRange(resolveRange(scope, month, cycleStart));
        response.setTotalsSpent(totals);
        response.setBalance(new BalanceSummaryDTO(balanceResult.getDirection(), balanceResult.getAmountPLN()));
        response.setLastSettlement(settlements.stream()
            .max(Comparator.comparing(Settlement::getCreatedAt))
            .map(settlementService::toDTO)
            .orElse(null));

        return response;
    }

    @Transactional(readOnly = true)
    public SpendingChartResponse getSpendingChart(Scope scope, YearMonth month) {
        SummaryResponse summary = getSummary(scope, month);
        BigDecimal maciek = summary.getTotalsSpent().getOrDefault(Person.MACIEK, BigDecimal.ZERO);
        BigDecimal emilka = summary.getTotalsSpent().getOrDefault(Person.EMILKA, BigDecimal.ZERO);
        return new SpendingChartResponse(
            List.of("MACIEK", "EMILKA"),
            List.of(maciek, emilka)
        );
    }

    private LocalDateRange buildExpenseDateRange(Scope scope, YearMonth month, LocalDate cycleStartDate) {
        if (scope == Scope.MONTH) {
            if (month == null) {
                throw new IllegalArgumentException("month is required for scope=MONTH");
            }
            return new LocalDateRange(month.atDay(1), month.atEndOfMonth());
        }
        if (scope == Scope.CYCLE) {
            // Only include expenses on or after the cycle start date.
            // dateTo is unbounded so all future dates are included.
            return new LocalDateRange(cycleStartDate, null);
        }
        // LIFETIME: no date constraint
        return new LocalDateRange(null, null);
    }

    private List<Settlement> loadSettlementsForScope(Scope scope, YearMonth month, List<Settlement> allSettlements) {
        if (scope == Scope.CYCLE || scope == Scope.LIFETIME) {
            // Pass all settlements — BalanceCalculator handles full-settlement resets.
            return allSettlements;
        }
        // MONTH: only settlements created in that month.
        OffsetDateTime start = month.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime end = month.plusMonths(1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        return allSettlements.stream()
            .filter(s -> !s.getCreatedAt().isBefore(start) && s.getCreatedAt().isBefore(end))
            .toList();
    }

    private DateRangeDTO resolveRange(Scope scope, YearMonth month, OffsetDateTime cycleStart) {
        if (scope == Scope.MONTH) {
            LocalDate from = month.atDay(1);
            LocalDate to = month.atEndOfMonth();
            return new DateRangeDTO(from, to);
        }
        if (scope == Scope.CYCLE) {
            LocalDate from = cycleStart != null ? cycleStart.toLocalDate() : null;
            return new DateRangeDTO(from, LocalDate.now());
        }
        return new DateRangeDTO(null, LocalDate.now());
    }

    private Map<Person, BigDecimal> initTotals() {
        Map<Person, BigDecimal> totals = new EnumMap<>(Person.class);
        totals.put(Person.MACIEK, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        totals.put(Person.EMILKA, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        return totals;
    }
}
