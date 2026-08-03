package ma.splittrack.project.api.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProjectDTO {
    private Long id;
    private String name;
    private String description;
    private BigDecimal budgetPLN;
    private BigDecimal spentPLN;
    private List<ProjectExpenseDTO> expenses;
}
