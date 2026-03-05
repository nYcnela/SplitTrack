package ma.splittrack.expense.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.common.domain.Person;
import ma.splittrack.common.domain.SettlementMode;

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
    private String receiptUrl;

    @Schema(description = "amountPLN if payer=MACIEK, else null")
    private BigDecimal maciekPaid;

    @Schema(description = "amountPLN if payer=EMILKA, else null")
    private BigDecimal emilkaPaid;

    private boolean affectsBalance;
    private Person owedFrom;
    private Person owedTo;
    private BigDecimal owedAmountPLN;
}
