package ma.splittrack.project.infrastructure;

import java.util.List;
import ma.splittrack.project.domain.ProjectExpense;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectExpenseRepository extends JpaRepository<ProjectExpense, Long> {
    List<ProjectExpense> findByProjectIdOrderByExpenseDateDescIdDesc(Long projectId);
}
