package ma.splittrack.project.infrastructure;

import java.util.List;
import ma.splittrack.project.domain.Project;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findAllByOrderBySortOrderAscIdAsc();
}
