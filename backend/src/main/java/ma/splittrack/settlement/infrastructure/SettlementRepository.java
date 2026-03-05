package ma.splittrack.settlement.infrastructure;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import ma.splittrack.settlement.domain.Settlement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    Optional<Settlement> findTopByOrderByCreatedAtDesc();

    Optional<Settlement> findTopByIsFullTrueOrderByCreatedAtDesc();

    Page<Settlement> findByCreatedAtBetween(OffsetDateTime from, OffsetDateTime to, Pageable pageable);

    List<Settlement> findByCreatedAtBetween(OffsetDateTime from, OffsetDateTime to);

    List<Settlement> findByCreatedAtAfter(OffsetDateTime from);
}
