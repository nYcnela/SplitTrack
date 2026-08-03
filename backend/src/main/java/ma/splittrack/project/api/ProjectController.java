package ma.splittrack.project.api;

import jakarta.validation.Valid;
import java.util.List;
import ma.splittrack.expense.api.dto.ReceiptUploadResponse;
import ma.splittrack.expense.application.ExpenseReceiptStorageService;
import ma.splittrack.project.api.dto.ProjectDTO;
import ma.splittrack.project.api.dto.ProjectExpenseDTO;
import ma.splittrack.project.api.dto.ProjectExpenseRequest;
import ma.splittrack.project.api.dto.ProjectRequest;
import ma.splittrack.project.api.dto.ProjectOrderRequest;
import ma.splittrack.project.application.ProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final ExpenseReceiptStorageService imageStorageService;

    public ProjectController(ProjectService projectService, ExpenseReceiptStorageService imageStorageService) {
        this.projectService = projectService;
        this.imageStorageService = imageStorageService;
    }

    @GetMapping public List<ProjectDTO> list() { return projectService.list(); }
    @PostMapping public ProjectDTO create(@Valid @RequestBody ProjectRequest request) { return projectService.create(request); }
    @PutMapping("/order") @ResponseStatus(HttpStatus.NO_CONTENT) public void reorder(@Valid @RequestBody ProjectOrderRequest request) { projectService.reorder(request.projectIds()); }
    @PutMapping("/{projectId}") public ProjectDTO update(@PathVariable("projectId") Long projectId, @Valid @RequestBody ProjectRequest request) { return projectService.update(projectId, request); }
    @DeleteMapping("/{projectId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable("projectId") Long projectId) { projectService.delete(projectId); }
    @PostMapping("/{projectId}/expenses") public ProjectExpenseDTO createExpense(@PathVariable("projectId") Long projectId, @Valid @RequestBody ProjectExpenseRequest request) { return projectService.createExpense(projectId, request); }
    @PutMapping("/{projectId}/expenses/{expenseId}") public ProjectExpenseDTO updateExpense(@PathVariable("projectId") Long projectId, @PathVariable("expenseId") Long expenseId, @Valid @RequestBody ProjectExpenseRequest request) { return projectService.updateExpense(projectId, expenseId, request); }
    @DeleteMapping("/{projectId}/expenses/{expenseId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteExpense(@PathVariable("projectId") Long projectId, @PathVariable("expenseId") Long expenseId) { projectService.deleteExpense(projectId, expenseId); }
    @PostMapping(value = "/images", consumes = "multipart/form-data") public ReceiptUploadResponse uploadImage(@RequestPart("file") MultipartFile file) { return new ReceiptUploadResponse(imageStorageService.store(file)); }
}
