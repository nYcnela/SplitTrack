package ma.splittrack.expense.infrastructure;

import jakarta.persistence.criteria.Predicate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import ma.splittrack.common.domain.LocalDateRange;
import ma.splittrack.expense.domain.Expense;
import org.springframework.data.jpa.domain.Specification;

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
