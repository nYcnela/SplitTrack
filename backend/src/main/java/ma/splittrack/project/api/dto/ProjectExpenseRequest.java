package ma.splittrack.project.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectExpenseRequest {
    @NotNull
    private LocalDate expenseDate;
    @NotBlank @Size(max = 200)
    private String description;
    @NotNull @DecimalMin(value = "0.01") @Digits(integer = 10, fraction = 2)
    private BigDecimal amountPLN;
    @Size(max = 10)
    private List<@NotBlank @Size(max = 2000) String> imageUrls;
}
