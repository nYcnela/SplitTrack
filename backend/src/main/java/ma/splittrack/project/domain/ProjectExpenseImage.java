package ma.splittrack.project.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "project_expense_images")
@Getter
@Setter
@NoArgsConstructor
public class ProjectExpenseImage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "project_expense_id", nullable = false)
    private Long projectExpenseId;
    @Column(name = "image_url", nullable = false)
    private String imageUrl;
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;
}
