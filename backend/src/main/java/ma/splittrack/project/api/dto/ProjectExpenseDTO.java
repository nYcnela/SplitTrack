package ma.splittrack.project.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectExpenseDTO {
    private Long id;
    private LocalDate expenseDate;
    private String description;
    private BigDecimal amountPLN;
    private List<String> imageUrls;
}
