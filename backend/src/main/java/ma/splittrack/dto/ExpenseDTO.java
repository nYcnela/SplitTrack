package ma.splittrack.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.model.Person;
import ma.splittrack.model.SettlementMode;

@Getter
@Setter
@NoArgsConstructor
public class ExpenseDTO {
    private Long id;
    private LocalDate expenseDate;
    private String description;
    private Person payer;
    private BigDecimal amountPLN;
    private BigDecimal originalAmount;
    private String originalCurrency;
    private BigDecimal exchangeRateToPLN;
    private SettlementMode settlementMode;
    private BigDecimal customOwedPLN;

    @Schema(description = "amountPLN if payer=MACIEK, else null")
    private BigDecimal maciekPaid;

    @Schema(description = "amountPLN if payer=EMILKA, else null")
    private BigDecimal emilkaPaid;

    private boolean affectsBalance;
    private Person owedFrom;
    private Person owedTo;
    private BigDecimal owedAmountPLN;
}
