package ma.splittrack.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import ma.splittrack.model.BalanceDirection;
import ma.splittrack.model.Expense;
import ma.splittrack.model.Person;
import ma.splittrack.model.Scope;
import ma.splittrack.model.SettlementMode;
import ma.splittrack.repository.ExpenseRepository;
import ma.splittrack.repository.SettlementRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

class SummaryServiceTest {

    @Test
    void futureMonthReturnsEvenAndIgnoresPreenteredExpenses() {
        ExpenseRepository expenseRepository = mock(ExpenseRepository.class);
        SettlementRepository settlementRepository = mock(SettlementRepository.class);
        ExpenseScopeResolver scopeResolver = mock(ExpenseScopeResolver.class);
        SettlementService settlementService = mock(SettlementService.class);
        BalanceCalculator balanceCalculator = new BalanceCalculator();

        Expense preenteredFutureExpense = new Expense();
        preenteredFutureExpense.setSettlementMode(SettlementMode.HALF);
        preenteredFutureExpense.setPayer(Person.MACIEK);
        preenteredFutureExpense.setAmountPLN(new BigDecimal("120.00"));
        preenteredFutureExpense.setCreatedAt(OffsetDateTime.now());

        when(expenseRepository.findAll(any(Specification.class))).thenReturn(List.of(preenteredFutureExpense));
        when(settlementRepository.findAll()).thenReturn(List.of());
        when(settlementRepository.findTopByOrderByCreatedAtDesc()).thenReturn(Optional.empty());

        SummaryService service = new SummaryService(
            expenseRepository,
            settlementRepository,
            scopeResolver,
            balanceCalculator,
            settlementService
        );

        YearMonth futureMonth = YearMonth.now().plusMonths(1);
        var response = service.getSummary(Scope.MONTH, futureMonth);

        assertEquals(BalanceDirection.EVEN, response.getBalance().getDirection());
        assertEquals(0, response.getBalance().getAmountPLN().compareTo(new BigDecimal("0.00")));
        assertEquals(0, response.getTotalsSpent().get(Person.MACIEK).compareTo(new BigDecimal("0.00")));
        assertEquals(0, response.getTotalsSpent().get(Person.EMILKA).compareTo(new BigDecimal("0.00")));

        verify(expenseRepository, never()).findAll(any(Specification.class));
        verify(settlementRepository, never()).findAll();
    }
}
