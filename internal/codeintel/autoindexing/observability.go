package autoindexing

import (
	"fmt"

	"github.com/sourcegraph/sourcegraph/internal/metrics"
	"github.com/sourcegraph/sourcegraph/internal/observation"
)

type operations struct {
	delete                      *observation.Operation
	enqueue                     *observation.Operation
	get                         *observation.Operation
	getBatch                    *observation.Operation
	infer                       *observation.Operation
	list                        *observation.Operation
	updateIndexingConfiguration *observation.Operation

	deleteIndexesWithoutRepository *observation.Operation
	staleSourcedCommits            *observation.Operation
	updateSourcedCommits           *observation.Operation
	deleteSourcedCommits           *observation.Operation
	// temporary
	inferIndexConfiguration *observation.Operation
	queueIndex              *observation.Operation
	queueIndexForPackage    *observation.Operation
}

func newOperations(observationContext *observation.Context) *operations {
	metrics := metrics.NewREDMetrics(
		observationContext.Registerer,
		"codeintel_autoindexing",
		metrics.WithLabels("op"),
		metrics.WithCountHelp("Total number of method invocations."),
	)

	op := func(name string) *observation.Operation {
		return observationContext.Operation(observation.Op{
			Name:              fmt.Sprintf("codeintel.autoindexing.%s", name),
			MetricLabelValues: []string{name},
			Metrics:           metrics,
		})
	}

	return &operations{
		delete:                      op("Delete"),
		enqueue:                     op("Enqueue"),
		get:                         op("Get"),
		getBatch:                    op("GetBatch"),
		infer:                       op("Infer"),
		inferIndexConfiguration:     op("InferIndexConfiguration"),
		list:                        op("List"),
		queueIndex:                  op("QueueIndex"),
		queueIndexForPackage:        op("QueueIndexForPackage"),
		updateIndexingConfiguration: op("UpdateIndexingConfiguration"),

		deleteIndexesWithoutRepository: op("DeleteIndexesWithoutRepository"),
		staleSourcedCommits:            op("StaleSourcedCommits"),
		updateSourcedCommits:           op("UpdateSourcedCommits"),
		deleteSourcedCommits:           op("DeleteSourcedCommits"),
	}
}
