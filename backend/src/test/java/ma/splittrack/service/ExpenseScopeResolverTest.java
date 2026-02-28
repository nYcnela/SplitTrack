package ma.splittrack.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.time.YearMonth;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import ma.splittrack.model.Scope;
import ma.splittrack.repository.SettlementRepository;

public class ExpenseScopeResolverTest {
    @Test
    void monthScopeResolvesCalendarRange() {
        SettlementRepository repository = Mockito.mock(SettlementRepository.class);
        ExpenseScopeResolver resolver = new ExpenseScopeResolver(repository);

        var range = resolver.resolveExpenseDateRange(Scope.MONTH, YearMonth.of(2026, 2), null, null);

        assertEquals("2026-02-01", range.getFrom().toString());
        assertEquals("2026-02-28", range.getTo().toString());
    }

    @Test
    void lifetimeScopeKeepsRangeEmpty() {
        SettlementRepository repository = Mockito.mock(SettlementRepository.class);
        ExpenseScopeResolver resolver = new ExpenseScopeResolver(repository);

        var range = resolver.resolveExpenseDateRange(Scope.LIFETIME, null, null, null);

        assertNull(range.getFrom());
        assertNull(range.getTo());
    }
}
