package ma.splittrack.repository;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import ma.splittrack.model.Expense;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import ma.splittrack.model.LocalDateRange;

public class ExpenseSpecifications {
    public static Specification<Expense> build(String query, LocalDateRange dateRange, OffsetDateTime createdAfter) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (query != null && !query.isBlank()) {
                String like = "%" + query.toLowerCase() + "%";
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), like));
            }

            if (dateRange != null) {
                if (dateRange.getFrom() != null) {
                    predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("expenseDate"), dateRange.getFrom()));
                }
                if (dateRange.getTo() != null) {
                    predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("expenseDate"), dateRange.getTo()));
                }
            }

            if (createdAfter != null) {
                predicates.add(criteriaBuilder.greaterThan(root.get("createdAt"), createdAfter));
            }

            return predicates.isEmpty()
                ? criteriaBuilder.conjunction()
                : criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
