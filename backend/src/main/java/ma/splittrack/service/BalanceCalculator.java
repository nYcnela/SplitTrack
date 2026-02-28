package ma.splittrack.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;
import ma.splittrack.model.BalanceDirection;
import ma.splittrack.model.Person;
import ma.splittrack.model.SettlementMode;
import ma.splittrack.model.Expense;
import ma.splittrack.model.Settlement;

@Component
public class BalanceCalculator {
    public Optional<ImpliedTransfer> impliedTransfer(Expense expense) {
        if (expense.getSettlementMode() == SettlementMode.NOT_SETTLED) {
            return Optional.empty();
        }

        BigDecimal owedAmount;
        if (expense.getSettlementMode() == SettlementMode.HALF) {
            owedAmount = expense.getAmountPLN()
                .divide(new BigDecimal("2"), 2, RoundingMode.HALF_UP);
        } else {
            owedAmount = scale2(expense.getCustomOwedPLN());
        }

        Person owedFrom = expense.getPayer() == Person.MACIEK ? Person.EMILKA : Person.MACIEK;
        Person owedTo = expense.getPayer();
        return Optional.of(new ImpliedTransfer(owedFrom, owedTo, owedAmount));
    }

    /**
     * Calculates the net balance considering full settlements as reset points.
     * A full settlement means "we are even" — all prior transactions are zeroed out.
     * Events are merged in chronological order; when a full settlement is encountered,
     * the net resets to zero.
     */
    public BigDecimal calculateNet(List<Expense> expenses, List<Settlement> settlements) {
        // Build a unified, chronologically sorted list of balance events
        List<BalanceEvent> events = new ArrayList<>();

        for (Expense expense : expenses) {
            Optional<ImpliedTransfer> transfer = impliedTransfer(expense);
            if (transfer.isEmpty()) {
                continue;
            }
            ImpliedTransfer t = transfer.get();
            events.add(new BalanceEvent(expense.getCreatedAt(), t.getFromPerson(), t.getToPerson(), t.getAmountPLN(), true, false));
        }

        for (Settlement settlement : settlements) {
            events.add(new BalanceEvent(settlement.getCreatedAt(), settlement.getFromPerson(), settlement.getToPerson(), settlement.getAmountPLN(), false, settlement.isFull()));
        }

        // Sort chronologically
        events.sort(Comparator.comparing(BalanceEvent::timestamp, Comparator.nullsFirst(Comparator.naturalOrder())));

        BigDecimal net = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

        for (BalanceEvent event : events) {
            if (event.isFullSettlement()) {
                // Full settlement = everything is settled, reset to zero
                net = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
                continue;
            }
            net = applyTransfer(net, event.from(), event.to(), event.amount(), event.isImplied());
        }

        return net.setScale(2, RoundingMode.HALF_UP);
    }

    public BalanceResult toBalanceResult(BigDecimal net) {
        int sign = net.compareTo(BigDecimal.ZERO);
        if (sign > 0) {
            return new BalanceResult(BalanceDirection.EMILKA_OWES_MACIEK, net.abs().setScale(2, RoundingMode.HALF_UP));
        }
        if (sign < 0) {
            return new BalanceResult(BalanceDirection.MACIEK_OWES_EMILKA, net.abs().setScale(2, RoundingMode.HALF_UP));
        }
        return new BalanceResult(BalanceDirection.EVEN, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
    }

    private BigDecimal applyTransfer(BigDecimal currentNet, Person from, Person to, BigDecimal amount, boolean isImplied) {
        BigDecimal adjusted = amount.setScale(2, RoundingMode.HALF_UP);
        if (from == Person.EMILKA && to == Person.MACIEK) {
            return isImplied ? currentNet.add(adjusted) : currentNet.subtract(adjusted);
        }
        if (from == Person.MACIEK && to == Person.EMILKA) {
            return isImplied ? currentNet.subtract(adjusted) : currentNet.add(adjusted);
        }
        return currentNet;
    }

    private BigDecimal scale2(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Internal record to unify expenses and settlements into a single chronological stream.
     */
    private record BalanceEvent(
        OffsetDateTime timestamp,
        Person from,
        Person to,
        BigDecimal amount,
        boolean isImplied,
        boolean isFullSettlement
    ) {}
}
