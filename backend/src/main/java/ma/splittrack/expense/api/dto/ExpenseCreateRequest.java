package ma.splittrack.expense.api.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.common.domain.Person;
import ma.splittrack.common.domain.SettlementMode;
import ma.splittrack.project.api.dto.ProjectRequest;

@Getter
@Setter
@NoArgsConstructor
public class ExpenseCreateRequest {
    @NotNull
    @Schema(example = "2026-02-23")
    private LocalDate expenseDate;

    @NotBlank
    @Schema(example = "Zakupy Lidl")
    private String description;

    @NotNull
    @Schema(example = "MACIEK")
    private Person payer;

    @NotNull
    @Schema(example = "HALF")
    private SettlementMode settlementMode;

    @Schema(example = "30.00")
    private BigDecimal customOwedPLN;

    @NotBlank
    @Schema(example = "PLN")
    private String inputCurrency;

    @NotNull
    @Positive
    @Schema(example = "123.45")
    private BigDecimal inputAmount;

    @Schema(example = "4.50")
    private BigDecimal exchangeRateToPLN;

    @Schema(example = "https://example.com/paragon.jpg")
    private String receiptUrl;

    @Schema(example = "1")
    private Long projectId;

    @Valid
    private ProjectRequest newProject;
}
