package ma.splittrack.project.application;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.HashSet;
import java.util.stream.Collectors;
import ma.splittrack.project.api.dto.ProjectDTO;
import ma.splittrack.project.api.dto.ProjectExpenseDTO;
import ma.splittrack.project.api.dto.ProjectExpenseRequest;
import ma.splittrack.project.api.dto.ProjectRequest;
import ma.splittrack.project.domain.Project;
import ma.splittrack.project.domain.ProjectExpense;
import ma.splittrack.project.domain.ProjectExpenseImage;
import ma.splittrack.project.infrastructure.ProjectExpenseImageRepository;
import ma.splittrack.project.infrastructure.ProjectExpenseRepository;
import ma.splittrack.project.infrastructure.ProjectRepository;
import ma.splittrack.expense.domain.Expense;
import ma.splittrack.expense.infrastructure.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final ProjectExpenseRepository expenseRepository;
    private final ProjectExpenseImageRepository imageRepository;
    private final ExpenseRepository regularExpenseRepository;

    public ProjectService(ProjectRepository projectRepository, ProjectExpenseRepository expenseRepository,
                          ProjectExpenseImageRepository imageRepository, ExpenseRepository regularExpenseRepository) {
        this.projectRepository = projectRepository;
        this.expenseRepository = expenseRepository;
        this.imageRepository = imageRepository;
        this.regularExpenseRepository = regularExpenseRepository;
    }

    @Transactional(readOnly = true)
    public List<ProjectDTO> list() {
        return projectRepository.findAllByOrderBySortOrderAscIdAsc().stream().map(this::toDTO).toList();
    }

    @Transactional
    public ProjectDTO create(ProjectRequest request) {
        Project project = new Project();
        applyProjectRequest(project, request);
        project.setSortOrder(projectRepository.findAllByOrderBySortOrderAscIdAsc().stream()
            .map(Project::getSortOrder).max(Integer::compareTo).orElse(-1) + 1);
        return toDTO(projectRepository.save(project));
    }

    @Transactional
    public ProjectDTO update(Long projectId, ProjectRequest request) {
        Project project = findProject(projectId);
        applyProjectRequest(project, request);
        return toDTO(project);
    }

    @Transactional
    public void delete(Long projectId) {
        projectRepository.delete(findProject(projectId));
    }

    @Transactional
    public void reorder(List<Long> projectIds) {
        List<Project> projects = projectRepository.findAllByOrderBySortOrderAscIdAsc();
        if (projects.size() != projectIds.size()
            || !projects.stream().map(Project::getId).collect(Collectors.toSet()).equals(new HashSet<>(projectIds))) {
            throw new IllegalArgumentException("Nieprawidłowa kolejność projektów");
        }
        Map<Long, Project> byId = projects.stream().collect(Collectors.toMap(Project::getId, project -> project));
        for (int index = 0; index < projectIds.size(); index++) {
            byId.get(projectIds.get(index)).setSortOrder(index);
        }
    }

    @Transactional
    public ProjectExpenseDTO createExpense(Long projectId, ProjectExpenseRequest request) {
        findProject(projectId);
        ProjectExpense expense = new ProjectExpense();
        expense.setProjectId(projectId);
        applyExpenseRequest(expense, request);
        ProjectExpense saved = expenseRepository.save(expense);
        replaceImages(saved.getId(), request.getImageUrls());
        return toExpenseDTO(saved);
    }

    @Transactional
    public ProjectExpenseDTO updateExpense(Long projectId, Long expenseId, ProjectExpenseRequest request) {
        ProjectExpense expense = findExpense(projectId, expenseId);
        applyExpenseRequest(expense, request);
        replaceImages(expense.getId(), request.getImageUrls());
        return toExpenseDTO(expense);
    }

    @Transactional
    public void deleteExpense(Long projectId, Long expenseId) {
        expenseRepository.delete(findExpense(projectId, expenseId));
    }

    private void applyProjectRequest(Project project, ProjectRequest request) {
        project.setName(request.getName().trim());
        project.setDescription(normalizeText(request.getDescription()));
        project.setBudgetPLN(money(request.getBudgetPLN()));
    }

    private void applyExpenseRequest(ProjectExpense expense, ProjectExpenseRequest request) {
        expense.setExpenseDate(request.getExpenseDate());
        expense.setDescription(request.getDescription().trim());
        expense.setAmountPLN(money(request.getAmountPLN()));
    }

    private void replaceImages(Long expenseId, List<String> imageUrls) {
        imageRepository.deleteByProjectExpenseId(expenseId);
        List<String> normalized = imageUrls == null ? List.of() : imageUrls.stream()
            .map(this::normalizeText).filter(Objects::nonNull).toList();
        for (int index = 0; index < normalized.size(); index++) {
            String url = normalized.get(index);
            if (!url.startsWith("/uploads/") && !url.startsWith("https://") && !url.startsWith("http://")) {
                throw new IllegalArgumentException("Nieprawidłowy adres zdjęcia rachunku");
            }
            ProjectExpenseImage image = new ProjectExpenseImage();
            image.setProjectExpenseId(expenseId);
            image.setImageUrl(url);
            image.setSortOrder(index);
            imageRepository.save(image);
        }
    }

    private Project findProject(Long id) {
        return projectRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Projekt nie istnieje"));
    }

    private ProjectExpense findExpense(Long projectId, Long expenseId) {
        ProjectExpense expense = expenseRepository.findById(expenseId)
            .orElseThrow(() -> new IllegalArgumentException("Wydatek projektu nie istnieje"));
        if (!expense.getProjectId().equals(projectId)) {
            throw new IllegalArgumentException("Wydatek nie należy do tego projektu");
        }
        return expense;
    }

    private ProjectDTO toDTO(Project project) {
        List<ProjectExpenseDTO> expenses = new java.util.ArrayList<>();
        expenses.addAll(expenseRepository.findByProjectIdOrderByExpenseDateDescIdDesc(project.getId()).stream()
            .map(this::toExpenseDTO).toList());
        expenses.addAll(regularExpenseRepository.findByProjectIdOrderByExpenseDateDescIdDesc(project.getId()).stream()
            .map(this::toExpenseDTO).toList());
        expenses.sort(java.util.Comparator.comparing(ProjectExpenseDTO::getExpenseDate).reversed()
            .thenComparing(ProjectExpenseDTO::getId, java.util.Comparator.reverseOrder()));
        ProjectDTO dto = new ProjectDTO();
        dto.setId(project.getId());
        dto.setName(project.getName());
        dto.setDescription(project.getDescription());
        dto.setBudgetPLN(project.getBudgetPLN());
        dto.setSpentPLN(expenses.stream().map(ProjectExpenseDTO::getAmountPLN).reduce(BigDecimal.ZERO, BigDecimal::add));
        dto.setExpenses(expenses);
        return dto;
    }

    private ProjectExpenseDTO toExpenseDTO(ProjectExpense expense) {
        ProjectExpenseDTO dto = new ProjectExpenseDTO();
        dto.setId(expense.getId());
        dto.setExpenseDate(expense.getExpenseDate());
        dto.setDescription(expense.getDescription());
        dto.setAmountPLN(expense.getAmountPLN());
        dto.setImageUrls(imageRepository.findByProjectExpenseIdOrderBySortOrderAscIdAsc(expense.getId()).stream()
            .map(ProjectExpenseImage::getImageUrl).toList());
        dto.setSource("PROJECT_EXPENSE");
        return dto;
    }

    private ProjectExpenseDTO toExpenseDTO(Expense expense) {
        ProjectExpenseDTO dto = new ProjectExpenseDTO();
        dto.setId(expense.getId());
        dto.setExpenseDate(expense.getExpenseDate());
        dto.setDescription(expense.getDescription());
        dto.setAmountPLN(expense.getAmountPLN());
        dto.setImageUrls(receiptUrls(expense.getReceiptUrl()));
        dto.setSource("EXPENSE");
        return dto;
    }

    private List<String> receiptUrls(String receiptUrl) {
        if (receiptUrl == null || receiptUrl.isBlank() || receiptUrl.trim().startsWith("[")) {
            return List.of();
        }
        return List.of(receiptUrl);
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeText(String value) {
        return value == null || value.trim().isEmpty() ? null : value.trim();
    }
}
