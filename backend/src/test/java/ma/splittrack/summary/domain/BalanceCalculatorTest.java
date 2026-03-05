package ma.splittrack.summary.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.List;
import ma.splittrack.common.domain.Person;
import ma.splittrack.common.domain.SettlementMode;
import ma.splittrack.expense.domain.Expense;
import ma.splittrack.settlement.domain.Settlement;
import org.junit.jupiter.api.Test;

public class BalanceCalculatorTest {
    private final BalanceCalculator calculator = new BalanceCalculator();

    @Test
    void halfSplitCreatesImpliedTransfer() {
        Expense expense = new Expense();
        expense.setSettlementMode(SettlementMode.HALF);
        expense.setPayer(Person.MACIEK);
        expense.setAmountPLN(new BigDecimal("100.00"));

        var transfer = calculator.impliedTransfer(expense);
        assertTrue(transfer.isPresent());
        assertEquals(Person.EMILKA, transfer.get().getFromPerson());
        assertEquals(Person.MACIEK, transfer.get().getToPerson());
        assertEquals(new BigDecimal("50.00"), transfer.get().getAmountPLN());
    }

    @Test
    void customOwedUsesProvidedAmount() {
        Expense expense = new Expense();
        expense.setSettlementMode(SettlementMode.CUSTOM);
        expense.setPayer(Person.EMILKA);
        expense.setCustomOwedPLN(new BigDecimal("30.00"));
        expense.setAmountPLN(new BigDecimal("120.00"));

        var transfer = calculator.impliedTransfer(expense);
        assertTrue(transfer.isPresent());
        assertEquals(Person.MACIEK, transfer.get().getFromPerson());
        assertEquals(Person.EMILKA, transfer.get().getToPerson());
        assertEquals(new BigDecimal("30.00"), transfer.get().getAmountPLN());
    }

    @Test
    void fullModeUsesWholeAmount() {
        Expense expense = new Expense();
        expense.setSettlementMode(SettlementMode.FULL);
        expense.setPayer(Person.MACIEK);
        expense.setAmountPLN(new BigDecimal("80.00"));

        var transfer = calculator.impliedTransfer(expense);
        assertTrue(transfer.isPresent());
        assertEquals(Person.EMILKA, transfer.get().getFromPerson());
        assertEquals(Person.MACIEK, transfer.get().getToPerson());
        assertEquals(new BigDecimal("80.00"), transfer.get().getAmountPLN());
    }

    @Test
    void settlementsReduceNetBalance() {
        Expense expense = new Expense();
        expense.setSettlementMode(SettlementMode.HALF);
        expense.setPayer(Person.MACIEK);
        expense.setAmountPLN(new BigDecimal("100.00"));

        Settlement settlement = new Settlement();
        settlement.setFromPerson(Person.EMILKA);
        settlement.setToPerson(Person.MACIEK);
        settlement.setAmountPLN(new BigDecimal("20.00"));

        BigDecimal net = calculator.calculateNet(List.of(expense), List.of(settlement));
        assertEquals(new BigDecimal("30.00"), net);
    }
}
