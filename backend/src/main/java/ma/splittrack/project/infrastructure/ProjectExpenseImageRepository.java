package ma.splittrack.project.infrastructure;

import java.util.List;
import ma.splittrack.project.domain.ProjectExpenseImage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectExpenseImageRepository extends JpaRepository<ProjectExpenseImage, Long> {
    List<ProjectExpenseImage> findByProjectExpenseIdOrderBySortOrderAscIdAsc(Long projectExpenseId);
    void deleteByProjectExpenseId(Long projectExpenseId);
}
