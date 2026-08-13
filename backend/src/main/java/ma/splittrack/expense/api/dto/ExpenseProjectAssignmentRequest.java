package ma.splittrack.expense.api.dto;

import jakarta.validation.Valid;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.splittrack.project.api.dto.ProjectRequest;

@Getter
@Setter
@NoArgsConstructor
public class ExpenseProjectAssignmentRequest {
    private Long projectId;

    @Valid
    private ProjectRequest newProject;
}
